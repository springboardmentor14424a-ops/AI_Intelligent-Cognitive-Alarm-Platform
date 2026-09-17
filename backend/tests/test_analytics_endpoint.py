from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.main import (
    Base,
    ChallengeAttempt,
    SleepLog,
    User,
    app,
    db_session,
    issue_token,
    pwd_context,
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


def _make_user(session_factory, email="fresh@example.com"):
    db = session_factory()
    user = User(name="Fresh User", email=email, password=pwd_context.hash("Str0ngPass!"), role="USER", provider="LOCAL")
    db.add(user)
    db.commit()
    db.refresh(user)
    token = issue_token(user)
    db.close()
    return user.id, token


def test_analytics_reports_null_scores_when_no_data_exists_yet(client):
    """A brand-new account has no challenge attempts and no sleep logs. The gauges on
    the dashboard treat null/missing scores as "not enough observations yet" (shown as
    an em dash), but a literal 0 renders as if the user scored zero. The endpoint must
    send null, not 0, until there is real data to compute a score from."""
    test_client, session_factory = client
    _, token = _make_user(session_factory)

    response = test_client.get("/analytics", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    body = response.json()
    assert body["focus_score"] is None
    assert body["sleep_score"] is None


def test_analytics_computes_sleep_score_from_logged_sleep(client):
    test_client, session_factory = client
    user_id, token = _make_user(session_factory, email="sleeper@example.com")

    db = session_factory()
    now = datetime.now(timezone.utc)
    db.add(
        SleepLog(
            user_id=user_id,
            sleep_time=now - timedelta(hours=8),
            wake_time=now,
            quality=82,
        )
    )
    db.commit()
    db.close()

    response = test_client.get("/analytics", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert response.json()["sleep_score"] == 82


def test_analytics_computes_focus_score_from_completed_challenges(client):
    test_client, session_factory = client
    user_id, token = _make_user(session_factory, email="focused@example.com")

    db = session_factory()
    db.add(
        ChallengeAttempt(
            user_id=user_id,
            challenge_type="MATH",
            difficulty="MEDIUM",
            intent="WAKE_UP",
            prompt="p",
            expected_answer="1",
            submitted_answer="1",
            status="COMPLETED",
            completed=True,
            is_correct=True,
            completed_at=datetime.now(timezone.utc),
            time_limit_seconds=75,
            max_attempts=2,
        )
    )
    db.commit()
    db.close()

    response = test_client.get("/analytics", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert response.json()["focus_score"] == 100


def test_analytics_requires_authentication(client):
    test_client, _ = client
    response = test_client.get("/analytics")
    assert response.status_code == 401
