from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.main import (
    Alarm,
    Base,
    ChallengeAttempt,
    User,
    UserProfile,
    app,
    db_session,
    issue_token,
    max_snoozes_for_alarm,
    pwd_context,
    verify_wake_completion,
)


@pytest.fixture()
def db():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)
    session = Session()
    try:
        yield session
    finally:
        session.close()
        engine.dispose()


@pytest.fixture()
def client():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    TestingSession = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)

    def override_db_session():
        session = TestingSession()
        try:
            yield session
        finally:
            session.close()

    app.dependency_overrides[db_session] = override_db_session
    with TestClient(app) as test_client:
        yield test_client, TestingSession
    app.dependency_overrides.clear()
    engine.dispose()


def make_user_and_alarm(session, difficulty="MEDIUM", wake_verification_mode="SINGLE", snooze_minutes=5):
    user = User(name="Wake Test", email="wake@example.com", password="hash", role="USER", provider="LOCAL")
    session.add(user)
    session.flush()
    session.add(UserProfile(user_id=user.id, timezone="UTC"))
    alarm = Alarm(
        user_id=user.id,
        alarm_time=datetime.now().time(),
        alarm_type="DAILY",
        status="RINGING",
        difficulty=difficulty,
        wake_verification_mode=wake_verification_mode,
        snooze_minutes=snooze_minutes,
        last_fired_at=datetime.now(timezone.utc),
    )
    session.add(alarm)
    session.flush()
    return user, alarm


def make_wake_attempt(session, user_id, alarm_id, *, correct, verification_passed=True, elapsed_seconds=10, time_limit=75, minutes_ago=1):
    attempt = ChallengeAttempt(
        user_id=user_id,
        alarm_id=alarm_id,
        challenge_type="MATH",
        difficulty="MEDIUM",
        intent="WAKE_UP",
        prompt="p",
        expected_answer="1",
        completed=True,
        is_correct=correct,
        verification_passed=verification_passed if correct else False,
        elapsed_seconds=elapsed_seconds,
        time_limit_seconds=time_limit,
        completed_at=datetime.now(timezone.utc) - timedelta(minutes=minutes_ago),
    )
    session.add(attempt)
    session.flush()
    return attempt


# --- Verification methods (Module 6) ---

def test_single_mode_passes_with_one_successful_attempt(db):
    user, alarm = make_user_and_alarm(db, wake_verification_mode="SINGLE")
    make_wake_attempt(db, user.id, alarm.alarm_id, correct=True)
    assert verify_wake_completion(alarm, user, db) is not None


def test_single_mode_fails_with_no_attempts(db):
    user, alarm = make_user_and_alarm(db, wake_verification_mode="SINGLE")
    assert verify_wake_completion(alarm, user, db) is None


def test_multi_step_requires_two_successful_attempts(db):
    user, alarm = make_user_and_alarm(db, wake_verification_mode="MULTI_STEP")
    make_wake_attempt(db, user.id, alarm.alarm_id, correct=True, minutes_ago=2)
    assert verify_wake_completion(alarm, user, db) is None
    make_wake_attempt(db, user.id, alarm.alarm_id, correct=True, minutes_ago=1)
    assert verify_wake_completion(alarm, user, db) is not None


def test_consecutive_mode_fails_if_most_recent_two_are_not_both_correct(db):
    user, alarm = make_user_and_alarm(db, wake_verification_mode="CONSECUTIVE")
    make_wake_attempt(db, user.id, alarm.alarm_id, correct=True, minutes_ago=3)
    make_wake_attempt(db, user.id, alarm.alarm_id, correct=False, minutes_ago=2)
    make_wake_attempt(db, user.id, alarm.alarm_id, correct=True, minutes_ago=1)
    # Most recent two (minutes_ago=2 fail, minutes_ago=1 pass) are not both correct.
    assert verify_wake_completion(alarm, user, db) is None


def test_consecutive_mode_passes_when_last_two_are_both_correct(db):
    user, alarm = make_user_and_alarm(db, wake_verification_mode="CONSECUTIVE")
    make_wake_attempt(db, user.id, alarm.alarm_id, correct=True, minutes_ago=2)
    make_wake_attempt(db, user.id, alarm.alarm_id, correct=True, minutes_ago=1)
    assert verify_wake_completion(alarm, user, db) is not None


def test_timed_mode_fails_when_answer_took_longer_than_the_limit(db):
    user, alarm = make_user_and_alarm(db, wake_verification_mode="TIMED")
    make_wake_attempt(db, user.id, alarm.alarm_id, correct=True, elapsed_seconds=999, time_limit=75)
    assert verify_wake_completion(alarm, user, db) is None


def test_timed_mode_passes_within_the_limit(db):
    user, alarm = make_user_and_alarm(db, wake_verification_mode="TIMED")
    make_wake_attempt(db, user.id, alarm.alarm_id, correct=True, elapsed_seconds=30, time_limit=75)
    assert verify_wake_completion(alarm, user, db) is not None


def test_accuracy_mode_requires_three_attempts_and_80_percent(db):
    user, alarm = make_user_and_alarm(db, wake_verification_mode="ACCURACY")
    make_wake_attempt(db, user.id, alarm.alarm_id, correct=True, minutes_ago=2)
    make_wake_attempt(db, user.id, alarm.alarm_id, correct=True, minutes_ago=1)
    # Only 2 of the required 3-attempt window so far.
    assert verify_wake_completion(alarm, user, db) is None

    make_wake_attempt(db, user.id, alarm.alarm_id, correct=False, minutes_ago=3)
    # 2/3 correct = 67%, below the 80% threshold.
    assert verify_wake_completion(alarm, user, db) is None


def test_accuracy_mode_passes_at_80_percent_or_above(db):
    user, alarm = make_user_and_alarm(db, wake_verification_mode="ACCURACY")
    make_wake_attempt(db, user.id, alarm.alarm_id, correct=True, minutes_ago=3)
    make_wake_attempt(db, user.id, alarm.alarm_id, correct=True, minutes_ago=2)
    make_wake_attempt(db, user.id, alarm.alarm_id, correct=True, minutes_ago=1)
    assert verify_wake_completion(alarm, user, db) is not None


# --- Anti-snooze workflow (Module 6) ---

def _token_for(session_factory, difficulty="MEDIUM"):
    session = session_factory()
    user, alarm = make_user_and_alarm(session, difficulty=difficulty)
    session.commit()
    token = issue_token(user)
    alarm_id = alarm.alarm_id
    session.close()
    return token, alarm_id


def test_max_snoozes_scales_with_difficulty():
    assert max_snoozes_for_alarm(type("A", (), {"difficulty": "BEGINNER"})) == 3
    assert max_snoozes_for_alarm(type("A", (), {"difficulty": "EXPERT"})) == 1


def test_snooze_is_blocked_after_reaching_the_cap(client):
    test_client, session_factory = client
    token, alarm_id = _token_for(session_factory, difficulty="EXPERT")  # cap = 1
    headers = {"Authorization": f"Bearer {token}"}

    first = test_client.post(f"/alarms/{alarm_id}/snooze", headers=headers)
    assert first.status_code == 200

    # Snoozing sets status back to ACTIVE; simulate the alarm ringing again
    # for the same cycle (same last_fired_at) without going through the
    # background scheduler, to test the cap in isolation.
    session = session_factory()
    alarm = session.get(Alarm, alarm_id)
    alarm.status = "RINGING"
    alarm.snoozed_until = None
    session.commit()
    session.close()

    second = test_client.post(f"/alarms/{alarm_id}/snooze", headers=headers)
    assert second.status_code == 409
    assert "Maximum snoozes" in second.json()["detail"]


def test_snooze_cap_allows_multiple_snoozes_for_lower_difficulty(client):
    test_client, session_factory = client
    token, alarm_id = _token_for(session_factory, difficulty="BEGINNER")  # cap = 3
    headers = {"Authorization": f"Bearer {token}"}

    for _ in range(3):
        response = test_client.post(f"/alarms/{alarm_id}/snooze", headers=headers)
        assert response.status_code == 200
        session = session_factory()
        alarm = session.get(Alarm, alarm_id)
        alarm.status = "RINGING"
        alarm.snoozed_until = None
        session.commit()
        session.close()

    fourth = test_client.post(f"/alarms/{alarm_id}/snooze", headers=headers)
    assert fourth.status_code == 409
