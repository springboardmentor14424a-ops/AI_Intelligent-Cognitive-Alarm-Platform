from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.fcm_service import FCMPushService
from backend.main import (
    Base,
    ChallengeAttempt,
    DeviceToken,
    Notification,
    app,
    db_session,
    issue_token,
    pwd_context,
    _notification_records,
    User,
)


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
        db = TestingSession()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[db_session] = override_db_session
    with TestClient(app) as test_client:
        yield test_client, TestingSession
    app.dependency_overrides.clear()
    engine.dispose()


def _token_for_new_user(session_factory, email="push@example.com"):
    db = session_factory()
    user = User(name="Push User", email=email, password=pwd_context.hash("Str0ngPass!"), role="USER", provider="LOCAL")
    db.add(user)
    db.commit()
    db.refresh(user)
    token = issue_token(user)
    db.close()
    return user.id, token


def test_fcm_service_is_disabled_without_credentials(monkeypatch):
    monkeypatch.delenv("FIREBASE_CREDENTIALS_JSON", raising=False)
    monkeypatch.delenv("FIREBASE_CREDENTIALS_PATH", raising=False)
    service = FCMPushService()
    assert service.enabled is False


def test_fcm_send_no_ops_when_disabled(monkeypatch):
    monkeypatch.delenv("FIREBASE_CREDENTIALS_JSON", raising=False)
    monkeypatch.delenv("FIREBASE_CREDENTIALS_PATH", raising=False)
    service = FCMPushService()
    result = service.send(["token-1"], title="Hi", body="There")
    assert result == {"sent": 0, "failed": 0, "skipped": True}


def test_register_device_token_persists_and_reports_push_state(client):
    test_client, session_factory = client
    _, token = _token_for_new_user(session_factory)
    response = test_client.post(
        "/notifications/device-tokens",
        json={"token": "fcm-device-token-123", "platform": "web"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 201
    assert response.json()["registered"] is True
    assert "push_enabled" in response.json()


def test_register_device_token_upserts_on_conflict(client):
    test_client, session_factory = client
    user_id, token = _token_for_new_user(session_factory)
    payload = {"token": "shared-device-token", "platform": "web"}
    first = test_client.post("/notifications/device-tokens", json=payload, headers={"Authorization": f"Bearer {token}"})
    second = test_client.post("/notifications/device-tokens", json=payload, headers={"Authorization": f"Bearer {token}"})
    assert first.status_code == 201
    assert second.status_code == 201

    db = session_factory()
    rows = db.query(DeviceToken).filter(DeviceToken.token == "shared-device-token").all()
    assert len(rows) == 1
    db.close()


def test_unregister_device_token_removes_row(client):
    test_client, session_factory = client
    _, token = _token_for_new_user(session_factory)
    test_client.post(
        "/notifications/device-tokens",
        json={"token": "removable-token", "platform": "web"},
        headers={"Authorization": f"Bearer {token}"},
    )
    response = test_client.delete(
        "/notifications/device-tokens/removable-token", headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 204

    db = session_factory()
    rows = db.query(DeviceToken).filter(DeviceToken.token == "removable-token").all()
    assert rows == []
    db.close()


def test_challenge_reminder_fires_for_an_active_unanswered_challenge(client):
    _, session_factory = client
    user_id, _ = _token_for_new_user(session_factory, email="challenge-reminder@example.com")
    db = session_factory()
    user = db.get(User, user_id)
    db.add(ChallengeAttempt(
        user_id=user_id, challenge_type="MATH", difficulty="MEDIUM", intent="WAKE_UP",
        prompt="p", expected_answer="1", status="ACTIVE", completed=False,
        time_limit_seconds=75, max_attempts=2,
    ))
    db.commit()

    records = _notification_records(user, db)

    assert any(record["type"] == "CHALLENGE_REMINDER" for record in records)
    db.close()


def test_no_challenge_reminder_without_an_active_challenge(client):
    _, session_factory = client
    user_id, _ = _token_for_new_user(session_factory, email="no-challenge@example.com")
    db = session_factory()
    user = db.get(User, user_id)

    records = _notification_records(user, db)

    assert not any(record["type"] == "CHALLENGE_REMINDER" for record in records)
    db.close()


def test_notification_does_not_duplicate_within_the_refresh_window(client):
    _, session_factory = client
    user_id, _ = _token_for_new_user(session_factory, email="no-dupe@example.com")
    db = session_factory()
    user = db.get(User, user_id)
    db.add(ChallengeAttempt(
        user_id=user_id, challenge_type="MATH", difficulty="MEDIUM", intent="WAKE_UP",
        prompt="p", expected_answer="1", status="ACTIVE", completed=False,
        time_limit_seconds=75, max_attempts=2,
    ))
    db.commit()

    _notification_records(user, db)
    _notification_records(user, db)  # second call, same active challenge still present

    count = db.query(Notification).filter(
        Notification.user_id == user_id, Notification.notification_type == "CHALLENGE_REMINDER"
    ).count()
    assert count == 1
    db.close()


def test_notification_refreshes_after_the_window_passes(client):
    """Regression test for the old one-time-ever stub: a still-true condition
    must produce a fresh reminder once enough real time has passed, not stay
    silent forever after the first notification."""
    _, session_factory = client
    user_id, _ = _token_for_new_user(session_factory, email="refresh@example.com")
    db = session_factory()
    user = db.get(User, user_id)
    db.add(ChallengeAttempt(
        user_id=user_id, challenge_type="MATH", difficulty="MEDIUM", intent="WAKE_UP",
        prompt="p", expected_answer="1", status="ACTIVE", completed=False,
        time_limit_seconds=75, max_attempts=2,
    ))
    db.commit()

    _notification_records(user, db)
    stale = db.query(Notification).filter(Notification.user_id == user_id).one()
    stale.created_at = datetime.now(timezone.utc) - timedelta(hours=21)
    db.commit()

    _notification_records(user, db)

    count = db.query(Notification).filter(
        Notification.user_id == user_id, Notification.notification_type == "CHALLENGE_REMINDER"
    ).count()
    assert count == 2
    db.close()
