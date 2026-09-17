from datetime import datetime, time, timedelta, timezone

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.main import (
    Alarm,
    Base,
    User,
    UserProfile,
    next_alarm_options,
    scheduled_occurrence,
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


def make_user_with_alarm(db, alarm_type="DAILY", **alarm_kwargs):
    user = User(name="Test User", email="user@example.com", password="hash", role="USER", provider="LOCAL")
    db.add(user)
    db.flush()
    db.add(UserProfile(user_id=user.id, timezone="UTC"))
    db.flush()
    alarm = Alarm(user_id=user.id, alarm_time=time(7, 0), alarm_type=alarm_type, status="ACTIVE", **alarm_kwargs)
    db.add(alarm)
    db.flush()
    return user, alarm


def test_next_alarm_options_prioritizes_active_snooze_over_regular_schedule(db_session):
    # next_alarm_options compares snooze expiry against the real wall clock
    # (datetime.now), not the injectable `now` used for regular scheduling -
    # so this needs real-time-relative values rather than a fixed date.
    snoozed_until = datetime.now(timezone.utc) + timedelta(minutes=5)
    user, alarm = make_user_with_alarm(db_session, snoozed_until=snoozed_until)

    _, _, options = next_alarm_options(user, db_session)

    next_at = next(moment for candidate, moment in options if candidate.alarm_id == alarm.alarm_id)
    assert next_at == snoozed_until


def test_next_alarm_options_resumes_normal_schedule_after_snooze_expires(db_session):
    expired_snooze = datetime.now(timezone.utc) - timedelta(minutes=1)
    user, alarm = make_user_with_alarm(db_session, snoozed_until=expired_snooze)

    _, _, options = next_alarm_options(user, db_session)

    next_at = next(moment for candidate, moment in options if candidate.alarm_id == alarm.alarm_id)
    # Falls through to the next real 07:00 occurrence, not the stale snooze time.
    assert next_at != expired_snooze
    assert alarm.snoozed_until is None


def test_smart_adaptive_alarm_delays_on_low_sleep_score(db_session):
    user, alarm = make_user_with_alarm(db_session, alarm_type="SMART_ADAPTIVE")
    base = scheduled_occurrence(alarm, None, datetime(2026, 8, 3, 6, 0))
    delayed = scheduled_occurrence(alarm, 40, datetime(2026, 8, 3, 6, 0))
    assert delayed == base + timedelta(minutes=15)


def test_non_adaptive_alarm_ignores_sleep_score(db_session):
    user, alarm = make_user_with_alarm(db_session, alarm_type="DAILY")
    base = scheduled_occurrence(alarm, None, datetime(2026, 8, 3, 6, 0))
    with_score = scheduled_occurrence(alarm, 10, datetime(2026, 8, 3, 6, 0))
    assert base == with_score
