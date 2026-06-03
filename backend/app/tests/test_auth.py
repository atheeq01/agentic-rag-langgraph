import pytest
from app.models.user import User
from sqlalchemy import select

# register a new user helper
def create_user(client, email="test@test.com", password="TestPass@123"):
    return client.post("/auth/register", json={
        "email": email,
        "password": password,
        "full_name": "Test User"
    })

# check successful user registration
def test_register_success(client):
    res = create_user(client)
    assert res.status_code == 200
    data = res.json()
    assert data["token_type"] == "bearer"

# check prevention of duplicate email registration
def test_register_duplicates(client):
    create_user(client)
    res = create_user(client)
    assert res.status_code == 400
    assert "already" in res.json()["detail"].lower()

# check validation for invalid registration data
def test_register_invalid_data(client):
    res = client.post("/auth/register", json={
        "email": "invalid_email",
        "password": "short",
        "full_name": "",
    })
    assert res.status_code == 422

# check successful login using JSON
def test_login_json_success(client):
    create_user(client)
    res = client.post("/auth/login", json={
        "email": "test@test.com",
        "password": "TestPass@123"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["token_type"] == "bearer"
    assert "access_token" in data

# check login failure with invalid credentials
def test_login_json_invalid(client):
    res = client.post("/auth/login", json={
        "email": "fake@test.com",
        "password": "wrong"
    })
    assert res.status_code == 401

# check successful login using OAuth2 form data
def test_login_form_success(client):
    create_user(client)
    res = client.post("/auth/login-form", data={
        "username": "test@test.com",
        "password": "TestPass@123"
    })
    assert res.status_code == 200

# check that deactivated accounts cannot log in
def test_login_deactivated_user(client, db):
    create_user(client, "inactive@test.com")
    user = db.scalar(select(User).where(User.email == "inactive@test.com"))
    user.is_active = False
    db.commit()

    res = client.post("/auth/login", json={
        "email": "inactive@test.com",
        "password": "TestPass@123"
    })
    assert res.status_code == 401
    assert "disabled" in res.json()["detail"].lower()

# check retrieving current user profile with valid token
def test_get_me_success(client):
    create_user(client)
    login_res = client.post("/auth/login", json={"email": "test@test.com", "password": "TestPass@123"})
    token = login_res.json()["access_token"]

    res = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    assert res.json()["email"] == "test@test.com"

# check that profile access is denied without token
def test_get_me_no_token(client):
    res = client.get("/auth/me")
    assert res.status_code == 401

# verifies that an account locks after 5 consecutive failed login attempts.
def test_account_lockout_on_multiple_failed_attempts(client, db):
    create_user(client, "lockout@test.com", "ValidPass@123")

    for _ in range(5):
        res = client.post("/auth/login", json={"email": "lockout@test.com", "password": "WrongPassword!"})
        assert res.status_code == 401

    res = client.post("/auth/login", json={"email": "lockout@test.com", "password": "WrongPassword!"})
    assert res.status_code == 401
    assert "account locked" in res.json()["detail"].lower()

# ensures users cannot reuse a password stored in their PasswordHistory
def test_password_reuse_is_prevented(client, db):
    create_user(client, "reuse@test.com", "InitialPass@123")
    login_res = client.post("/auth/login", json={"email": "reuse@test.com", "password": "InitialPass@123"})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    res = client.patch("/users/me/password", json={
        "old_password": "InitialPass@123",
        "new_password": "InitialPass@123"
    }, headers=headers)

    assert res.status_code == 400
    assert "cannot reuse" in res.json()["detail"].lower()