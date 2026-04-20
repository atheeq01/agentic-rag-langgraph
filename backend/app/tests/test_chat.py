import pytest
from uuid import UUID

def create_user(client, email):
    return client.post("/auth/register", json={
        "email": email,
        "password": "123456",
        "full_name": "Test User",
    })


def login(client, email):
    return client.post("/auth/login", json={
        "email": email,
        "password": "123456"
    })


def get_token(client, email):
    create_user(client, email)
    res = login(client, email)
    return res.json()["access_token"]


def auth_header(token):
    return {"Authorization": f"Bearer {token}"}

def test_create_session(client):
    token = get_token(client, "user1@test.com")

    res = client.post("/ai/sessions", headers=auth_header(token))

    assert res.status_code == 200
    data = res.json()

    assert "id" in data
    assert UUID(data["id"])
    assert "user_id" in data

def test_get_sessions(client):
    token = get_token(client, "user2@test.com")

    client.post("/ai/sessions", headers=auth_header(token))
    client.post("/ai/sessions", headers=auth_header(token))

    res = client.get("/ai/sessions", headers=auth_header(token))

    assert res.status_code == 200
    assert isinstance(res.json(), list)
    assert len(res.json()) >= 2

def test_get_messages_authorized(client):
    token = get_token(client, "user3@test.com")

    session = client.post("/ai/sessions", headers=auth_header(token)).json()

    res = client.get(
        f"/ai/sessions/{session['id']}/messages",
        headers=auth_header(token)
    )

    assert res.status_code == 200
    assert isinstance(res.json(), list)

def test_get_messages_unauthorized(client):
    token1 = get_token(client, "user4@test.com")
    token2 = get_token(client, "user5@test.com")

    session = client.post("/ai/sessions", headers=auth_header(token1)).json()

    res = client.get(
        f"/ai/sessions/{session['id']}/messages",
        headers=auth_header(token2)
    )

    assert res.status_code == 404

def test_send_message_success(client):
    token = get_token(client, "user6@test.com")

    session = client.post("/ai/sessions", headers=auth_header(token)).json()

    res = client.post(
        "/ai/messages",
        json={
            "session_id": session["id"],
            "role": "user",
            "content": "Hello AI"
        },
        headers=auth_header(token)
    )

    assert res.status_code == 200
    data = res.json()

    assert data["role"] == "assistant"
    assert "content" in data
