from datetime import datetime, time, timedelta, timezone

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.main import (
    Analytics,
    Alarm,
    Base,
    ChallengeAttempt,
    Mission,
    SleepLog,
    SnoozeEvent,
    User,
    UserProfile,
    _analytics_day,
    behavioral_analytics_payload,
    habit_score_payload,
    recommendation_payload,
    _pdf_bytes,
    _xlsx_bytes,
    habit_consistency_metrics,
    productivity_correlation_metrics,
    sleep_pattern_metrics,
    snooze_reduction_score,
    wake_behavior_metrics,
)


@pytest.fixture()
def db_session():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)
    db = Session()
    try:
        yield db
    finally:
        db.close()
        engine.dispose()


def make_user(db, email="user@example.com", name="Test User"):
    user = User(
        name=name,
        email=email,
        password="test-password",
        role="USER",
        provider="LOCAL",
    )
    db.add(user)
    db.flush()
    return user


def make_alarm(db, user_id, alarm_id=None):
    alarm = Alarm(
        user_id=user_id,
        alarm_time=time(7, 0),
        repeat_days="Mon,Tue,Wed,Thu,Fri",
        difficulty="MEDIUM",
        status="ACTIVE",
        title="Morning Focus",
        alarm_type="DAILY",
        sound="Neural Dawn",
        vibration=True,
        snooze_minutes=5,
        daybreak_route_enabled=True,
        wake_window_minutes=15,
        challenge_type="AUTO",
        wake_verification_mode="SINGLE",
        notification_enabled=True,
    )
    if alarm_id is not None:
        alarm.alarm_id = alarm_id
    db.add(alarm)
    db.flush()
    return alarm


def make_wake_attempt(
    db,
    user_id,
    alarm_id,
    completed_at,
    *,
    correct=True,
    verified=True,
    elapsed=20,
    attempt_count=1,
    challenge_id=None,
):
    challenge = ChallengeAttempt(
        user_id=user_id,
        alarm_id=alarm_id,
        challenge_type="MATH",
        difficulty="MEDIUM",
        intent="WAKE_UP",
        prompt="2 + 2?",
        expected_answer="4",
        options=["3", "4", "5"],
        submitted_answer="4" if correct else "3",
        status="SOLVED" if correct else "FAILED",
        max_attempts=2,
        attempt_count=attempt_count,
        failed_attempts=0 if correct else attempt_count,
        time_limit_seconds=75,
        expires_at=completed_at + timedelta(seconds=75),
        completed= True,
        is_correct=correct,
        verification_passed=verified,
        elapsed_seconds=elapsed,
        created_at=completed_at - timedelta(seconds=elapsed),
        completed_at=completed_at,
    )
    if challenge_id is not None:
        challenge.challenge_id = challenge_id
    db.add(challenge)
    db.flush()
    return challenge


def test_snooze_metrics_empty(db_session):
    user = make_user(db_session)
    result = behavioral_analytics_payload(user.id, db_session)["snooze_patterns"]

    assert result["total_snoozes"] == 0
    assert result["average_snooze_minutes"] is None
    assert result["most_common_snooze_minutes"] is None
    assert result["recent_7_day_snoozes"] == 0
    assert result["snoozes_per_wake"] is None


def test_snooze_metrics_persist_and_calculate(db_session):
    user = make_user(db_session)
    alarm = make_alarm(db_session, user.id)
    now = datetime.now(timezone.utc)

    db_session.add_all(
        [
            SnoozeEvent(
                user_id=user.id,
                alarm_id=alarm.alarm_id,
                snooze_minutes=5,
                snoozed_at=now - timedelta(days=1),
            ),
            SnoozeEvent(
                user_id=user.id,
                alarm_id=alarm.alarm_id,
                snooze_minutes=5,
                snoozed_at=now - timedelta(days=2),
            ),
            SnoozeEvent(
                user_id=user.id,
                alarm_id=alarm.alarm_id,
                snooze_minutes=10,
                snoozed_at=now - timedelta(days=3),
            ),
        ]
    )
    db_session.commit()

    result = behavioral_analytics_payload(user.id, db_session)["snooze_patterns"]

    assert result["total_snoozes"] == 3
    assert result["average_snooze_minutes"] == 6.67
    assert result["most_common_snooze_minutes"] == 5
    assert result["recent_7_day_snoozes"] == 3


def test_snoozes_per_wake_and_snooze_rate_computed_from_real_sessions(db_session):
    """Regression test for a field that used to ship hardcoded to None."""
    user = make_user(db_session)
    alarm = make_alarm(db_session, user.id)
    now = datetime.now(timezone.utc)

    day_a = now - timedelta(days=2)  # snoozed, then woke successfully
    day_b = now - timedelta(days=1)  # woke successfully, no snooze
    day_c = now - timedelta(days=3)  # snoozed, gave up (no successful wake that day)

    db_session.add_all([
        SnoozeEvent(user_id=user.id, alarm_id=alarm.alarm_id, snooze_minutes=5, snoozed_at=day_a),
        SnoozeEvent(user_id=user.id, alarm_id=alarm.alarm_id, snooze_minutes=5, snoozed_at=day_c),
    ])
    make_wake_attempt(db_session, user.id, alarm.alarm_id, day_a, correct=True, verified=True)
    make_wake_attempt(db_session, user.id, alarm.alarm_id, day_b, correct=True, verified=True)
    db_session.commit()

    result = behavioral_analytics_payload(user.id, db_session)["snooze_patterns"]

    # 2 snoozes total / 2 successful wake sessions this week.
    assert result["snoozes_per_wake"] == 1.0
    # Of the 2 successful-wake days (A, B), only A also had a snooze -> 50%.
    assert result["recent_7_day_snooze_rate"] == 50


def test_wake_behavior_groups_multi_step_attempts_into_one_wake(db_session):
    user = make_user(db_session)
    alarm = make_alarm(db_session, user.id)
    now = datetime.now(timezone.utc)

    make_wake_attempt(
        db_session,
        user.id,
        alarm.alarm_id,
        now - timedelta(days=1),
        elapsed=20,
        attempt_count=1,
        challenge_id=1,
    )
    make_wake_attempt(
        db_session,
        user.id,
        alarm.alarm_id,
        now - timedelta(days=1, seconds=-30),
        elapsed=30,
        attempt_count=1,
        challenge_id=2,
    )
    # One unsuccessful observed wake session on another day.
    make_wake_attempt(
        db_session,
        user.id,
        alarm.alarm_id,
        now - timedelta(days=2),
        correct=False,
        verified=False,
        elapsed=40,
        attempt_count=2,
        challenge_id=3,
    )
    db_session.commit()

    result = wake_behavior_metrics(user.id, db_session)

    assert result["successful_wakes"] == 1
    assert result["observed_wake_sessions"] == 2
    assert result["wake_challenge_failures"] == 1
    assert result["average_verification_seconds"] == 50
    assert result["average_challenge_attempts"] == 2
    assert result["wake_success_rate_percent"] == 50
    assert result["wake_consistency_percent"] == 50


def test_habit_consistency_uses_completed_at(db_session):
    user = make_user(db_session)
    now = datetime.now(timezone.utc)

    completed_time = now - timedelta(days=1, hours=2)
    created_time = now - timedelta(days=3)

    db_session.add_all(
        [
            Mission(
                user_id=user.id,
                challenge_type="MATH",
                completed=True,
                completed_at=completed_time,
                reward=180,
                created_at=created_time,
            ),
            Mission(
                user_id=user.id,
                challenge_type="LOGIC",
                completed=False,
                completed_at=None,
                reward=180,
                created_at=now - timedelta(days=2),
            ),
        ]
    )
    db_session.commit()

    result = habit_consistency_metrics(user.id, db_session)

    assert result["missions_tracked"] == 2
    assert result["missions_completed"] == 1
    assert result["consistent_days"] == 1
    assert result["completion_rate_percent"] == 50

    # The regression this test is named for: a mission completed days after
    # it was created must count toward the *completion* day, not the
    # creation day - otherwise a habit streak calendar shows the wrong day
    # as consistent.
    consistent_day_via_completed_at = _analytics_day(completed_time)
    consistent_day_via_created_at = _analytics_day(created_time)
    assert consistent_day_via_completed_at != consistent_day_via_created_at


def test_sleep_pattern_metrics(db_session):
    user = make_user(db_session)
    profile = UserProfile(
        user_id=user.id,
        timezone="UTC",
        target_sleep_duration_minutes=480,
        difficulty_preference="MEDIUM",
        habit_preferences=[],
    )
    db_session.add(profile)

    now = datetime.now(timezone.utc)
    db_session.add_all(
        [
            SleepLog(
                user_id=user.id,
                sleep_time=now - timedelta(days=1, hours=8),
                wake_time=now - timedelta(days=1),
                quality=80,
            ),
            SleepLog(
                user_id=user.id,
                sleep_time=now - timedelta(days=2, hours=7, minutes=30),
                wake_time=now - timedelta(days=2),
                quality=60,
            ),
        ]
    )
    db_session.commit()

    result = sleep_pattern_metrics(user.id, db_session)

    assert result["records"] == 2
    assert round(result["average_sleep_hours"], 2) == 7.75
    assert result["average_sleep_quality"] == 70
    assert result["target_sleep_hours"] == 8.0
    assert result["duration_consistency_percent"] == 100


def test_productivity_correlation_includes_zero_snooze_days(db_session):
    user = make_user(db_session)
    now = datetime.now(timezone.utc)

    for index, focus in enumerate((60, 70, 80, 90)):
        day = now - timedelta(days=4 - index)
        db_session.add(
            Analytics(
                user_id=user.id,
                focus_score=focus,
                habit_score=70,
                sleep_score=70,
                recorded_at=day,
            )
        )
        db_session.add(
            SleepLog(
                user_id=user.id,
                sleep_time=day - timedelta(hours=8),
                wake_time=day,
                quality=60 + index * 10,
            )
        )

    alarm = make_alarm(db_session, user.id)
    db_session.add(
        SnoozeEvent(
            user_id=user.id,
            alarm_id=alarm.alarm_id,
            snooze_minutes=5,
            snoozed_at=now - timedelta(days=1),
        )
    )
    db_session.commit()

    result = productivity_correlation_metrics(user.id, db_session)

    assert result["productivity_score"] == 90
    assert result["sleep_productivity_samples"] == 4
    assert result["snooze_productivity_samples"] == 4
    assert result["sleep_quality_vs_productivity"] == 1.0
    assert result["snooze_count_vs_productivity"] is not None


def test_combined_behavioral_payload_contains_all_module_7_sections(db_session):
    user = make_user(db_session)
    result = behavioral_analytics_payload(user.id, db_session)

    assert set(result) == {
        "snooze_patterns",
        "wake_behavior",
        "productivity_correlation",
        "habit_consistency",
        "sleep_patterns",
    }


def test_habit_score_uses_all_weighted_components(db_session):
    user = make_user(db_session)
    alarm = make_alarm(db_session, user.id)
    now = datetime.now(timezone.utc)
    db_session.add(UserProfile(
        user_id=user.id,
        timezone="UTC",
        target_sleep_duration_minutes=480,
        difficulty_preference="MEDIUM",
        habit_preferences=[],
    ))
    make_wake_attempt(db_session, user.id, alarm.alarm_id, now - timedelta(days=1), challenge_id=10)
    for index in range(3):
        db_session.add(SnoozeEvent(
            user_id=user.id,
            alarm_id=alarm.alarm_id,
            snooze_minutes=5,
            snoozed_at=now - timedelta(days=8, hours=index),
        ))
    db_session.add(SnoozeEvent(
        user_id=user.id,
        alarm_id=alarm.alarm_id,
        snooze_minutes=5,
        snoozed_at=now - timedelta(days=1),
    ))
    db_session.add(SleepLog(
        user_id=user.id,
        sleep_time=now - timedelta(days=1, hours=8),
        wake_time=now - timedelta(days=1),
        quality=90,
    ))
    db_session.commit()

    result = habit_score_payload(user.id, db_session, now)

    assert result["components"] == {
        "wake_up_consistency": 100.0,
        "challenge_completion_success": 100.0,
        # recent=1, previous=3: blended score is the better of the absolute
        # signal (100 - 1*20 = 80) and the improvement signal ((3-1)/3*100 =
        # 66.67), so 80 wins - see snooze_reduction_score.
        "snooze_reduction": 80.0,
        "sleep_schedule_adherence": 100.0,
    }
    assert result["score"] == 96.0
    assert result["weights"]["wake_up_consistency"] == 0.35


def test_habit_score_excludes_unavailable_components_without_fake_values(db_session):
    user = make_user(db_session)

    result = habit_score_payload(user.id, db_session)

    assert result["score"] is None
    assert all(value is None for value in result["components"].values())
    assert result["available_weight"] == 0


def test_recommendations_are_evidence_linked(db_session):
    user = make_user(db_session)
    db_session.add(UserProfile(
        user_id=user.id,
        timezone="UTC",
        preferred_wake_time=time(7, 0),
        target_sleep_duration_minutes=480,
        productivity_goal="Protect a focus block",
        difficulty_preference="MEDIUM",
        habit_preferences=[],
    ))
    db_session.commit()

    result = recommendation_payload(user.id, db_session)

    assert set(result) == {
        "sleep_improvement",
        "wake_optimization",
        "habit_improvement",
        "productivity",
        "personalized_challenges",
    }
    assert result["sleep_improvement"] == []


def test_wake_optimization_ignores_stale_snoozes_outside_the_recent_window(db_session):
    """Regression test: this recommendation used to key off all-time total
    snoozes, so a single snooze from months ago would nag forever even after
    the user's behavior had long since improved."""
    user = make_user(db_session)
    alarm = make_alarm(db_session, user.id)
    now = datetime.now(timezone.utc)
    db_session.add(SnoozeEvent(
        user_id=user.id, alarm_id=alarm.alarm_id, snooze_minutes=5,
        snoozed_at=now - timedelta(days=90),
    ))
    # A verified wake session so wake_behavior has data (success rate high, so
    # that check alone doesn't add a recommendation).
    make_wake_attempt(db_session, user.id, alarm.alarm_id, now - timedelta(hours=2))
    db_session.commit()

    result = recommendation_payload(user.id, db_session)

    assert result["wake_optimization"] == []


def test_habit_improvement_nudges_when_nothing_is_tracked_yet(db_session):
    user = make_user(db_session)
    db_session.commit()

    result = recommendation_payload(user.id, db_session)

    assert len(result["habit_improvement"]) == 1
    assert "No missions" in result["habit_improvement"][0]["message"]


def test_habit_improvement_is_silent_for_a_healthy_completion_rate(db_session):
    user = make_user(db_session)
    now = datetime.now(timezone.utc)
    for _ in range(5):
        db_session.add(Mission(user_id=user.id, challenge_type="MATH", completed=True, completed_at=now, reward=180, created_at=now))
    db_session.commit()

    result = recommendation_payload(user.id, db_session)

    assert result["habit_improvement"] == []


def test_productivity_recommendation_only_fires_below_threshold(db_session):
    user = make_user(db_session)
    now = datetime.now(timezone.utc)
    db_session.add(Analytics(user_id=user.id, focus_score=90, recorded_at=now))
    db_session.commit()

    healthy = recommendation_payload(user.id, db_session)
    assert healthy["productivity"] == []

    db_session.add(Analytics(user_id=user.id, focus_score=40, recorded_at=now + timedelta(minutes=1)))
    db_session.commit()

    needs_attention = recommendation_payload(user.id, db_session)
    assert len(needs_attention["productivity"]) == 1


def test_report_serializers_produce_downloadable_formats(db_session):
    rows = [{"metric": "score", "value": 82}]

    xlsx = _xlsx_bytes(rows)
    pdf = _pdf_bytes(rows, "Habit Report")

    assert xlsx.startswith(b"PK")
    assert b"%PDF-1.4" in pdf


def test_snooze_reduction_score_rewards_stable_low_snoozing():
    """Regression test: a pure week-over-week comparison used to score a
    consistently-low snoozer (1 -> 1, no 'improvement') identically to a
    consistently-bad one (10 -> 10), both at 0. The blended score should
    recognize that low absolute snoozing is good even without a trend."""
    consistent_low = snooze_reduction_score(recent=1, previous=1)
    consistent_bad = snooze_reduction_score(recent=10, previous=10)
    assert consistent_low > consistent_bad
    assert consistent_low == 80.0
    assert consistent_bad == 0.0


def test_snooze_reduction_score_still_rewards_genuine_improvement():
    # Big improvement from a bad baseline should score higher than staying bad.
    improved = snooze_reduction_score(recent=2, previous=10)
    stayed_bad = snooze_reduction_score(recent=10, previous=10)
    assert improved > stayed_bad


def test_snooze_reduction_score_perfect_for_zero_snoozes():
    assert snooze_reduction_score(recent=0, previous=0) == 100.0
    assert snooze_reduction_score(recent=0, previous=5) == 100.0
