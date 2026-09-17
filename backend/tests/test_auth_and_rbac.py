from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend import main as main_module
from backend.main import (
    Base,
    Role,
    User,
    app,
    apply_admin_bootstrap,
    db_session,
    issue_token,
    pwd_context,
    validate_password_strength,
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


def test_register_creates_user_and_returns_token(client):
    test_client, _ = client
    response = test_client.post(
        "/register",
        json={"name": "Ada", "email": "ada@example.com", "password": "Str0ngPass!"},
    )
    assert response.status_code == 201
    body = response.json()
    assert "access_token" in body


def test_register_rejects_weak_password(client):
    test_client, _ = client
    response = test_client.post(
        "/register",
        json={"name": "Ada", "email": "weak@example.com", "password": "weak"},
    )
    assert response.status_code == 422


def test_register_rejects_duplicate_email(client):
    test_client, _ = client
    payload = {"name": "Ada", "email": "dup@example.com", "password": "Str0ngPass!"}
    first = test_client.post("/register", json=payload)
    assert first.status_code == 201
    second = test_client.post("/register", json=payload)
    assert second.status_code in (400, 409, 422)


def test_login_succeeds_with_correct_credentials(client):
    test_client, _ = client
    test_client.post(
        "/register",
        json={"name": "Ada", "email": "login@example.com", "password": "Str0ngPass!"},
    )
    response = test_client.post(
        "/login", json={"email": "login@example.com", "password": "Str0ngPass!"}
    )
    assert response.status_code == 200
    assert "access_token" in response.json()


def test_login_rejects_wrong_password(client):
    test_client, _ = client
    test_client.post(
        "/register",
        json={"name": "Ada", "email": "wrongpass@example.com", "password": "Str0ngPass!"},
    )
    response = test_client.post(
        "/login", json={"email": "wrongpass@example.com", "password": "NotTheRight1"}
    )
    assert response.status_code == 401


def test_validate_password_strength_rejects_missing_number():
    with pytest.raises(Exception):
        validate_password_strength("NoNumbersHere")


def test_protected_route_requires_bearer_token(client):
    test_client, _ = client
    response = test_client.get("/profile")
    assert response.status_code == 401


def _make_user(session_factory, role):
    db = session_factory()
    user = User(
        name="RBAC User",
        email=f"{role.lower()}@example.com",
        password=pwd_context.hash("Str0ngPass!"),
        role=role,
        provider="LOCAL",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    token = issue_token(user)
    db.close()
    return token


def test_admin_only_route_rejects_regular_user(client):
    test_client, session_factory = client
    token = _make_user(session_factory, Role.USER.value)
    response = test_client.get(
        "/admin/users", headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 403


def test_admin_only_route_allows_admin(client):
    test_client, session_factory = client
    token = _make_user(session_factory, Role.ADMIN.value)
    response = test_client.get(
        "/admin/users", headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200


def test_coach_route_allows_wellness_coach_and_admin_only(client):
    test_client, session_factory = client
    coach_token = _make_user(session_factory, Role.WELLNESS_COACH.value)
    user_token = _make_user(session_factory, Role.USER.value)

    coach_response = test_client.get(
        "/coach/insights", headers={"Authorization": f"Bearer {coach_token}"}
    )
    assert coach_response.status_code == 200

    user_response = test_client.get(
        "/coach/insights", headers={"Authorization": f"Bearer {user_token}"}
    )
    assert user_response.status_code == 403


def test_apply_admin_bootstrap_promotes_matching_email(monkeypatch, client):
    _, session_factory = client
    monkeypatch.setattr(main_module, "ADMIN_BOOTSTRAP_EMAILS", {"bootstrap@example.com"})
    db = session_factory()
    user = User(name="Bootstrap", email="bootstrap@example.com", password="hash", role="USER", provider="LOCAL")
    db.add(user)
    db.commit()
    db.refresh(user)

    apply_admin_bootstrap(user, db)

    assert user.role == "ADMIN"
    db.close()


def test_apply_admin_bootstrap_ignores_non_matching_email(monkeypatch, client):
    _, session_factory = client
    monkeypatch.setattr(main_module, "ADMIN_BOOTSTRAP_EMAILS", {"bootstrap@example.com"})
    db = session_factory()
    user = User(name="Regular", email="someone-else@example.com", password="hash", role="USER", provider="LOCAL")
    db.add(user)
    db.commit()
    db.refresh(user)

    apply_admin_bootstrap(user, db)

    assert user.role == "USER"
    db.close()


def test_register_auto_promotes_bootstrap_email(monkeypatch, client):
    test_client, session_factory = client
    monkeypatch.setattr(main_module, "ADMIN_BOOTSTRAP_EMAILS", {"owner@example.com"})

    response = test_client.post(
        "/register",
        json={"name": "Owner", "email": "owner@example.com", "password": "Str0ngPass!"},
    )
    assert response.status_code == 201

    db = session_factory()
    user = db.query(User).filter(User.email == "owner@example.com").one()
    assert user.role == "ADMIN"
    db.close()


def test_login_auto_promotes_bootstrap_email_for_existing_user(monkeypatch, client):
    test_client, session_factory = client
    test_client.post(
        "/register",
        json={"name": "Late Bootstrap", "email": "late@example.com", "password": "Str0ngPass!"},
    )

    monkeypatch.setattr(main_module, "ADMIN_BOOTSTRAP_EMAILS", {"late@example.com"})
    response = test_client.post(
        "/login", json={"email": "late@example.com", "password": "Str0ngPass!"}
    )
    assert response.status_code == 200

    db = session_factory()
    user = db.query(User).filter(User.email == "late@example.com").one()
    assert user.role == "ADMIN"
    db.close()


def test_existing_session_self_heals_bootstrap_promotion_on_next_request(monkeypatch, client):
    """An already-logged-in user (stale token, DB role still USER) gets promoted the
    next time they make ANY authenticated request - not only on a fresh /login call.
    This matters because adding ADMIN_BOOTSTRAP_EMAILS to .env and restarting the
    backend does nothing for a browser tab that still holds an old valid token; the
    user would otherwise have to explicitly log out and back in to see the promotion.
    """
    test_client, session_factory = client
    db = session_factory()
    user = User(
        name="Stale Session",
        email="stale-session@example.com",
        password=pwd_context.hash("Str0ngPass!"),
        role="USER",
        provider="LOCAL",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    token = issue_token(user)
    db.close()

    monkeypatch.setattr(main_module, "ADMIN_BOOTSTRAP_EMAILS", {"stale-session@example.com"})

    response = test_client.get("/profile", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert response.json()["role"] == "ADMIN"

    db = session_factory()
    user = db.query(User).filter(User.email == "stale-session@example.com").one()
    assert user.role == "ADMIN"
    db.close()
