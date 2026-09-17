import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.main import Base, CoachAssignment, User, app, db_session, issue_token, pwd_context


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
    user_id = user.id
    db.close()
    return user_id, token


def _assign(session_factory, coach_id, member_id):
    db = session_factory()
    db.add(CoachAssignment(coach_id=coach_id, member_id=member_id))
    db.commit()
    db.close()


def test_coach_insights_includes_habit_score_and_note_count(client):
    test_client, session_factory = client
    coach_id, coach_token = _make_user(session_factory, "WELLNESS_COACH", "coach@example.com")
    member_id, _ = _make_user(session_factory, "USER", "member@example.com")
    _assign(session_factory, coach_id, member_id)

    response = test_client.get("/coach/insights", headers={"Authorization": f"Bearer {coach_token}"})
    assert response.status_code == 200
    body = response.json()
    member_entry = next(u for u in body["users"] if u["user_id"] == member_id)
    assert "habit_score" in member_entry
    assert member_entry["note_count"] == 0


def test_coach_can_add_and_list_notes_for_a_member(client):
    test_client, session_factory = client
    coach_id, coach_token = _make_user(session_factory, "WELLNESS_COACH", "coach2@example.com")
    member_id, _ = _make_user(session_factory, "USER", "member2@example.com")
    _assign(session_factory, coach_id, member_id)

    add_response = test_client.post(
        f"/coach/members/{member_id}/notes",
        json={"note": "Struggling with consistent wake times, suggested earlier bedtime."},
        headers={"Authorization": f"Bearer {coach_token}"},
    )
    assert add_response.status_code == 201
    assert add_response.json()["note"].startswith("Struggling")

    list_response = test_client.get(
        f"/coach/members/{member_id}/notes", headers={"Authorization": f"Bearer {coach_token}"}
    )
    assert list_response.status_code == 200
    notes = list_response.json()
    assert len(notes) == 1
    assert notes[0]["coach_name"] == "coach2"


def test_regular_user_cannot_access_coach_notes(client):
    test_client, session_factory = client
    _, user_token = _make_user(session_factory, "USER", "plain@example.com")
    other_member_id, _ = _make_user(session_factory, "USER", "member3@example.com")

    response = test_client.get(
        f"/coach/members/{other_member_id}/notes", headers={"Authorization": f"Bearer {user_token}"}
    )
    assert response.status_code == 403


def test_coach_notes_only_target_user_role_members(client):
    test_client, session_factory = client
    _, coach_token = _make_user(session_factory, "WELLNESS_COACH", "coach3@example.com")
    admin_id, _ = _make_user(session_factory, "ADMIN", "admin3@example.com")

    response = test_client.post(
        f"/coach/members/{admin_id}/notes",
        json={"note": "should not be allowed"},
        headers={"Authorization": f"Bearer {coach_token}"},
    )
    assert response.status_code == 404


def test_coach_can_send_message_creating_notification(client):
    test_client, session_factory = client
    coach_id, coach_token = _make_user(session_factory, "WELLNESS_COACH", "coach4@example.com")
    member_id, member_token = _make_user(session_factory, "USER", "member4@example.com")
    _assign(session_factory, coach_id, member_id)

    response = test_client.post(
        f"/coach/members/{member_id}/message",
        json={"title": "Great progress!", "message": "Keep up the consistent wake times."},
        headers={"Authorization": f"Bearer {coach_token}"},
    )
    assert response.status_code == 201
    assert response.json()["delivered_to"] == "member4"
    assert response.json()["push"]["skipped"] is True

    notifications_response = test_client.get(
        "/notifications", headers={"Authorization": f"Bearer {member_token}"}
    )
    assert notifications_response.status_code == 200
    types = [n["type"] for n in notifications_response.json()]
    assert "COACH_MESSAGE" in types


def test_coach_insights_excludes_unassigned_members(client):
    test_client, session_factory = client
    coach_id, coach_token = _make_user(session_factory, "WELLNESS_COACH", "coach5@example.com")
    assigned_id, _ = _make_user(session_factory, "USER", "assigned5@example.com")
    _make_user(session_factory, "USER", "unassigned5@example.com")
    _assign(session_factory, coach_id, assigned_id)

    response = test_client.get("/coach/insights", headers={"Authorization": f"Bearer {coach_token}"})
    assert response.status_code == 200
    body = response.json()
    assert body["users_tracked"] == 1
    assert [u["user_id"] for u in body["users"]] == [assigned_id]


def test_coach_cannot_message_unassigned_member(client):
    test_client, session_factory = client
    _, coach_token = _make_user(session_factory, "WELLNESS_COACH", "coach6@example.com")
    member_id, _ = _make_user(session_factory, "USER", "member6@example.com")

    response = test_client.post(
        f"/coach/members/{member_id}/message",
        json={"title": "Hi", "message": "Not your member"},
        headers={"Authorization": f"Bearer {coach_token}"},
    )
    assert response.status_code == 404


def test_admin_sees_all_members_in_coach_insights(client):
    test_client, session_factory = client
    _, admin_token = _make_user(session_factory, "ADMIN", "admin7@example.com")
    _make_user(session_factory, "USER", "member7a@example.com")
    _make_user(session_factory, "USER", "member7b@example.com")

    response = test_client.get("/coach/insights", headers={"Authorization": f"Bearer {admin_token}"})
    assert response.status_code == 200
    assert response.json()["users_tracked"] == 2


def test_admin_can_assign_and_unassign_member_to_coach(client):
    test_client, session_factory = client
    coach_id, coach_token = _make_user(session_factory, "WELLNESS_COACH", "coach8@example.com")
    _, admin_token = _make_user(session_factory, "ADMIN", "admin8@example.com")
    member_id, _ = _make_user(session_factory, "USER", "member8@example.com")

    assign_response = test_client.post(
        f"/admin/coaches/{coach_id}/members",
        json={"member_id": member_id},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert assign_response.status_code == 201
    assert assign_response.json()["already_assigned"] is False

    duplicate_response = test_client.post(
        f"/admin/coaches/{coach_id}/members",
        json={"member_id": member_id},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert duplicate_response.json()["already_assigned"] is True

    list_response = test_client.get(
        f"/admin/coaches/{coach_id}/members", headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert [m["user_id"] for m in list_response.json()["members"]] == [member_id]

    insights_response = test_client.get("/coach/insights", headers={"Authorization": f"Bearer {coach_token}"})
    assert insights_response.json()["users_tracked"] == 1

    unassign_response = test_client.delete(
        f"/admin/coaches/{coach_id}/members/{member_id}", headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert unassign_response.status_code == 204

    insights_after_response = test_client.get("/coach/insights", headers={"Authorization": f"Bearer {coach_token}"})
    assert insights_after_response.json()["users_tracked"] == 0


def test_non_admin_cannot_assign_members_to_coach(client):
    test_client, session_factory = client
    coach_id, coach_token = _make_user(session_factory, "WELLNESS_COACH", "coach9@example.com")
    member_id, _ = _make_user(session_factory, "USER", "member9@example.com")

    response = test_client.post(
        f"/admin/coaches/{coach_id}/members",
        json={"member_id": member_id},
        headers={"Authorization": f"Bearer {coach_token}"},
    )
    assert response.status_code == 403


def test_member_can_send_help_request_and_coach_can_reply(client):
    test_client, session_factory = client
    coach_id, coach_token = _make_user(session_factory, "WELLNESS_COACH", "coach10@example.com")
    member_id, member_token = _make_user(session_factory, "USER", "member10@example.com")
    _assign(session_factory, coach_id, member_id)

    ask_response = test_client.post(
        "/coach/help/messages",
        json={"message": "I keep sleeping through my alarm, what should I try?"},
        headers={"Authorization": f"Bearer {member_token}"},
    )
    assert ask_response.status_code == 201
    assert ask_response.json()["sender"] == "USER"

    insights_response = test_client.get("/coach/insights", headers={"Authorization": f"Bearer {coach_token}"})
    member_entry = next(u for u in insights_response.json()["users"] if u["user_id"] == member_id)
    assert member_entry["open_help_requests"] == 1

    coach_thread_response = test_client.get(
        f"/coach/members/{member_id}/help-messages", headers={"Authorization": f"Bearer {coach_token}"}
    )
    assert coach_thread_response.status_code == 200
    assert len(coach_thread_response.json()) == 1

    reply_response = test_client.post(
        f"/coach/members/{member_id}/help-messages",
        json={"message": "Try moving your alarm across the room and drinking water right after."},
        headers={"Authorization": f"Bearer {coach_token}"},
    )
    assert reply_response.status_code == 201
    assert reply_response.json()["sender"] == "COACH"

    member_thread_response = test_client.get(
        "/coach/help/messages", headers={"Authorization": f"Bearer {member_token}"}
    )
    body = member_thread_response.json()
    assert body["coach_assigned"] is True
    assert body["coach_name"] == "coach10"
    assert [m["sender"] for m in body["messages"]] == ["USER", "COACH"]

    notifications_response = test_client.get(
        "/notifications", headers={"Authorization": f"Bearer {member_token}"}
    )
    types = [n["type"] for n in notifications_response.json()]
    assert "COACH_HELP_REPLY" in types


def test_member_without_coach_cannot_send_help_request(client):
    test_client, session_factory = client
    _, member_token = _make_user(session_factory, "USER", "member11@example.com")

    response = test_client.post(
        "/coach/help/messages",
        json={"message": "Anyone there?"},
        headers={"Authorization": f"Bearer {member_token}"},
    )
    assert response.status_code == 404

    thread_response = test_client.get("/coach/help/messages", headers={"Authorization": f"Bearer {member_token}"})
    assert thread_response.status_code == 200
    assert thread_response.json() == {"coach_assigned": False, "coach_name": None, "messages": []}


def test_coach_cannot_reply_to_unassigned_member_help_thread(client):
    test_client, session_factory = client
    _, coach_token = _make_user(session_factory, "WELLNESS_COACH", "coach12@example.com")
    member_id, _ = _make_user(session_factory, "USER", "member12@example.com")

    response = test_client.post(
        f"/coach/members/{member_id}/help-messages",
        json={"message": "Not your member"},
        headers={"Authorization": f"Bearer {coach_token}"},
    )
    assert response.status_code == 404
