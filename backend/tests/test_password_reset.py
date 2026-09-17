from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend import main as main_module
from backend.main import (
    Base,
    PasswordResetCode,
    app,
    db_session,
)


@pytest.fixture()
def client(monkeypatch):
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

    monkeypatch.setattr(main_module, "smtp_configured", lambda: True)
    monkeypatch.setattr(main_module.secrets, "randbelow", lambda _n: 123456)
    sent_emails = []
    monkeypatch.setattr(
        main_module,
        "send_password_reset_email",
        lambda email, code: sent_emails.append((email, code)),
    )

    with TestClient(app) as test_client:
        yield test_client, TestingSession, sent_emails
    app.dependency_overrides.clear()
    engine.dispose()


def _register(test_client, email="reset@example.com", password="Str0ngPass!"):
    response = test_client.post(
        "/register", json={"name": "Reset Me", "email": email, "password": password}
    )
    assert response.status_code == 201
    return response


def _latest_code(session_factory, email):
    db = session_factory()
    reset = (
        db.query(PasswordResetCode)
        .filter(PasswordResetCode.email == email)
        .order_by(PasswordResetCode.sent_at.desc())
        .first()
    )
    db.close()
    return reset


def test_request_reset_unconfigured_smtp_returns_503(client, monkeypatch):
    test_client, _, _ = client
    monkeypatch.setattr(main_module, "smtp_configured", lambda: False)
    response = test_client.post(
        "/auth/password-reset/request", json={"email": "nobody@example.com"}
    )
    assert response.status_code == 503


def test_request_reset_for_unknown_email_returns_generic_message_without_sending(client):
    test_client, _, sent_emails = client
    response = test_client.post(
        "/auth/password-reset/request", json={"email": "nobody@example.com"}
    )
    assert response.status_code == 200
    assert "message" in response.json()
    assert sent_emails == []


def test_request_reset_for_known_email_sends_code(client):
    test_client, _, sent_emails = client
    _register(test_client)
    response = test_client.post(
        "/auth/password-reset/request", json={"email": "reset@example.com"}
    )
    assert response.status_code == 200
    assert len(sent_emails) == 1
    assert sent_emails[0][0] == "reset@example.com"
    assert len(sent_emails[0][1]) == 6


def test_resend_before_cooldown_is_rate_limited(client):
    test_client, _, sent_emails = client
    _register(test_client)
    first = test_client.post(
        "/auth/password-reset/request", json={"email": "reset@example.com"}
    )
    assert first.status_code == 200
    second = test_client.post(
        "/auth/password-reset/resend", json={"email": "reset@example.com"}
    )
    assert second.status_code == 429
    assert len(sent_emails) == 1


def test_confirm_with_correct_code_resets_password_and_allows_login(client):
    test_client, session_factory, _ = client
    _register(test_client)
    test_client.post("/auth/password-reset/request", json={"email": "reset@example.com"})

    confirm = test_client.post(
        "/auth/password-reset/confirm",
        json={
            "email": "reset@example.com",
            "otp": "123456",
            "new_password": "NewStr0ngPass!",
            "confirm_password": "NewStr0ngPass!",
        },
    )
    assert confirm.status_code == 200

    old_login = test_client.post(
        "/login", json={"email": "reset@example.com", "password": "Str0ngPass!"}
    )
    assert old_login.status_code == 401

    new_login = test_client.post(
        "/login", json={"email": "reset@example.com", "password": "NewStr0ngPass!"}
    )
    assert new_login.status_code == 200


def test_confirm_rejects_mismatched_confirmation(client):
    test_client, _, _ = client
    _register(test_client)
    test_client.post("/auth/password-reset/request", json={"email": "reset@example.com"})
    response = test_client.post(
        "/auth/password-reset/confirm",
        json={
            "email": "reset@example.com",
            "otp": "123456",
            "new_password": "NewStr0ngPass!",
            "confirm_password": "Different1!",
        },
    )
    assert response.status_code == 422


def test_confirm_rejects_wrong_otp(client):
    test_client, _, _ = client
    _register(test_client)
    test_client.post("/auth/password-reset/request", json={"email": "reset@example.com"})
    response = test_client.post(
        "/auth/password-reset/confirm",
        json={
            "email": "reset@example.com",
            "otp": "000000",
            "new_password": "NewStr0ngPass!",
            "confirm_password": "NewStr0ngPass!",
        },
    )
    assert response.status_code == 400


def test_confirm_rejects_expired_code(client):
    test_client, session_factory, _ = client
    _register(test_client)
    test_client.post("/auth/password-reset/request", json={"email": "reset@example.com"})

    db = session_factory()
    reset = db.query(PasswordResetCode).filter(PasswordResetCode.email == "reset@example.com").one()
    reset.expires_at = datetime.now(timezone.utc) - timedelta(minutes=1)
    db.commit()
    db.close()

    response = test_client.post(
        "/auth/password-reset/confirm",
        json={
            "email": "reset@example.com",
            "otp": "123456",
            "new_password": "NewStr0ngPass!",
            "confirm_password": "NewStr0ngPass!",
        },
    )
    assert response.status_code == 400


def test_confirm_locks_out_after_max_attempts(client):
    test_client, session_factory, _ = client
    _register(test_client)
    test_client.post("/auth/password-reset/request", json={"email": "reset@example.com"})

    for _ in range(main_module.RESET_MAX_ATTEMPTS):
        response = test_client.post(
            "/auth/password-reset/confirm",
            json={
                "email": "reset@example.com",
                "otp": "000000",
                "new_password": "NewStr0ngPass!",
                "confirm_password": "NewStr0ngPass!",
            },
        )
        assert response.status_code == 400

    locked = test_client.post(
        "/auth/password-reset/confirm",
        json={
            "email": "reset@example.com",
            "otp": "000000",
            "new_password": "NewStr0ngPass!",
            "confirm_password": "NewStr0ngPass!",
        },
    )
    assert locked.status_code == 429


def test_confirm_rejects_weak_new_password(client):
    test_client, session_factory, _ = client
    _register(test_client)
    test_client.post("/auth/password-reset/request", json={"email": "reset@example.com"})

    response = test_client.post(
        "/auth/password-reset/confirm",
        json={
            "email": "reset@example.com",
            "otp": "123456",
            "new_password": "weakweak",
            "confirm_password": "weakweak",
        },
    )
    assert response.status_code == 422


def test_confirm_code_cannot_be_reused(client):
    test_client, session_factory, _ = client
    _register(test_client)
    test_client.post("/auth/password-reset/request", json={"email": "reset@example.com"})

    code = "123456"

    first = test_client.post(
        "/auth/password-reset/confirm",
        json={
            "email": "reset@example.com",
            "otp": code,
            "new_password": "NewStr0ngPass!",
            "confirm_password": "NewStr0ngPass!",
        },
    )
    assert first.status_code == 200

    second = test_client.post(
        "/auth/password-reset/confirm",
        json={
            "email": "reset@example.com",
            "otp": code,
            "new_password": "AnotherPass1!",
            "confirm_password": "AnotherPass1!",
        },
    )
    assert second.status_code == 400
