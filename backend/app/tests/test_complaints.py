import pytest
from uuid import UUID

from app.models.user import User

def create_user(client, email="test@test.com", password="123456"):
    return client.post("/auth/register", json={
        "email": email,
        "password": password,
        "full_name": "Test User"
    })


def get_token(client):
    res = create_user(client)
    return res.json()["access_token"]


def auth_header(token):
    return {"Authorization": f"Bearer {token}"}

def create_complaint(client, token, payload=None):
    if payload is None:
        payload = {
            "title": "Harassment Issue",
            "description": "Bad behavior at workplace",
            "priority": "high",
            "is_anonymous": False,
            "against_user_id": None
        }

    return client.post(
        "/complaints/",
        json=payload,
        headers=auth_header(token)
    )

def test_get_my_complaints(client):
    token = get_token(client)

    create_complaint(client, token)

    res = client.get(
        "/complaints/me",
        headers=auth_header(token)
    )

    assert res.status_code == 200
    assert isinstance(res.json(), list)



def test_get_all_complaints_forbidden(client):
    token = get_token(client)

    res = client.get(
        "/complaints/",
        headers=auth_header(token)
    )

    assert res.status_code in [403, 401]

def test_get_single_complaint_success(client):
    token = get_token(client)

    created = create_complaint(client, token)
    complaint_id = created.json()["id"]

    res = client.get(
        f"/complaints/{complaint_id}",
        headers=auth_header(token)
    )

    assert res.status_code == 200
    assert res.json()["id"] == complaint_id


def test_get_single_complaint_not_found(client):
    token = get_token(client)

    fake_id = "00000000-0000-0000-0000-000000000000"

    res = client.get(
        f"/complaints/{fake_id}",
        headers=auth_header(token)
    )

    assert res.status_code == 404

def test_update_complaint_forbidden(client):
    token = get_token(client)

    created = create_complaint(client, token)
    complaint_id = created.json()["id"]

    res = client.patch(
        f"/complaints/{complaint_id}",
        json={
            "status": "resolved",
            "resolution_note": "Fixed"
        },
        headers=auth_header(token)
    )

    assert res.status_code in [403, 401]


def test_anonymous_complaints_forbidden(client):
    token = get_token(client)

    res = client.get(
        "/complaints/anonymous",
        headers=auth_header(token)
    )

    assert res.status_code in [403, 401]