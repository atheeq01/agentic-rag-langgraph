import pytest
from sqlalchemy import select
from app.models.user import User


def test_google_login_url(client, db):
    client.post("/auth/register", json={"email": "google@test.com", "password": "TestPass@123", "full_name": "Test"})
    token = client.post("/auth/login", json={"email": "google@test.com", "password": "TestPass@123"}).json()["access_token"]

    res = client.get("/auth/google/login", headers={"Authorization": f"Bearer {token}"})

    assert res.status_code == 200
    assert "auth_url" in res.json()
    assert "accounts.google.com" in res.json()["auth_url"]


def test_google_callback_user_not_found(client):
    fake_uuid = "00000000-0000-0000-0000-000000000000"
    res = client.get(f"/auth/google/callback?code=fakecode&state={fake_uuid}")
    assert res.status_code == 404