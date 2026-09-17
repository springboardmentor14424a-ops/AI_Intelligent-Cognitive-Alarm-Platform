import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend import main as main_module
from backend.main import Base, User, app, db_session, issue_token, pwd_context


class StubGeminiService:
    """Stands in for the real Gemini service so chat tests never hit the network."""

    enabled = True
    last_response_source = "GEMINI"

    def __init__(self):
        self.calls = []

    def generate_assistant_reply(self, message, user_profile=None, history=None):
        self.calls.append({"message": message, "user_profile": user_profile, "history": history})
        return f"stub reply #{len(self.calls)}"


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

    stub = StubGeminiService()
    monkeypatch.setattr(main_module, "get_gemini_service", lambda: stub)

    app.dependency_overrides[db_session] = override_db_session
    with TestClient(app) as test_client:
        yield test_client, TestingSession, stub
    app.dependency_overrides.clear()
    engine.dispose()


def _make_user(session_factory, email):
    db = session_factory()
    user = User(name=email.split("@")[0], email=email, password=pwd_context.hash("Str0ngPass!"), role="USER", provider="LOCAL")
    db.add(user)
    db.commit()
    db.refresh(user)
    token = issue_token(user)
    db.close()
    return token


def test_assistant_conversation_persists_across_turns(client):
    test_client, session_factory, stub = client
    token = _make_user(session_factory, "chatuser1@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    first = test_client.post("/assistant/help", json={"message": "I am tired and need help waking up"}, headers=headers)
    assert first.status_code == 200
    assert first.json()["reply"] == "stub reply #1"
    assert first.json()["source"] == "GEMINI"

    second = test_client.post("/assistant/help", json={"message": "What should I do next?"}, headers=headers)
    assert second.status_code == 200
    assert second.json()["reply"] == "stub reply #2"

    # the second call's history should include the first turn's user message and reply
    assert stub.calls[1]["history"] == [
        {"role": "USER", "content": "I am tired and need help waking up"},
        {"role": "ASSISTANT", "content": "stub reply #1"},
    ]

    history = test_client.get("/assistant/messages", headers=headers)
    assert history.status_code == 200
    roles = [m["role"] for m in history.json()["messages"]]
    assert roles == ["USER", "ASSISTANT", "USER", "ASSISTANT"]


def test_assistant_history_is_scoped_per_user(client):
    test_client, session_factory, _ = client
    token_a = _make_user(session_factory, "chatuser2@example.com")
    token_b = _make_user(session_factory, "chatuser3@example.com")

    test_client.post(
        "/assistant/help", json={"message": "help me wake up"}, headers={"Authorization": f"Bearer {token_a}"}
    )

    history_b = test_client.get("/assistant/messages", headers={"Authorization": f"Bearer {token_b}"})
    assert history_b.status_code == 200
    assert history_b.json()["messages"] == []


def test_clear_assistant_messages(client):
    test_client, session_factory, _ = client
    token = _make_user(session_factory, "chatuser4@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    test_client.post("/assistant/help", json={"message": "help me focus"}, headers=headers)
    clear_response = test_client.delete("/assistant/messages", headers=headers)
    assert clear_response.status_code == 204

    history = test_client.get("/assistant/messages", headers=headers)
    assert history.json()["messages"] == []


def test_assistant_requires_authentication(client):
    test_client, _, _ = client
    response = test_client.get("/assistant/messages")
    assert response.status_code == 401
