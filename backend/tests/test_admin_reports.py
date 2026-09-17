import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.main import Base, User, app, db_session, issue_token, pwd_context


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


def _make_user(session_factory, role, email):
    db = session_factory()
    user = User(name=email.split("@")[0], email=email, password=pwd_context.hash("Str0ngPass!"), role=role, provider="LOCAL")
    db.add(user)
    db.commit()
    db.refresh(user)
    token = issue_token(user)
    db.close()
    return token


@pytest.mark.parametrize("report_type,fmt", [
    ("users", "xlsx"),
    ("users", "pdf"),
    ("platform_summary", "xlsx"),
    ("platform_summary", "pdf"),
])
def test_admin_system_reports_download(client, report_type, fmt):
    test_client, session_factory = client
    admin_token = _make_user(session_factory, "ADMIN", "admin@example.com")

    response = test_client.get(
        f"/admin/reports/{report_type}?format={fmt}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 200
    assert len(response.content) > 0
    if fmt == "pdf":
        assert response.content.startswith(b"%PDF")
    else:
        assert response.content.startswith(b"PK")


def test_admin_reports_reject_unknown_type(client):
    test_client, session_factory = client
    admin_token = _make_user(session_factory, "ADMIN", "admin2@example.com")

    response = test_client.get(
        "/admin/reports/nonsense", headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert response.status_code == 404


def test_admin_reports_reject_non_admin(client):
    test_client, session_factory = client
    user_token = _make_user(session_factory, "USER", "user@example.com")

    response = test_client.get(
        "/admin/reports/users", headers={"Authorization": f"Bearer {user_token}"}
    )
    assert response.status_code == 403


def test_admin_reports_reject_coach(client):
    test_client, session_factory = client
    coach_token = _make_user(session_factory, "WELLNESS_COACH", "coach@example.com")

    response = test_client.get(
        "/admin/reports/users", headers={"Authorization": f"Bearer {coach_token}"}
    )
    assert response.status_code == 403
