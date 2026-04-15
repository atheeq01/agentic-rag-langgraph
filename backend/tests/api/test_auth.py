import uuid
### register check
def create_user(client, email=None, password="123456"):
    if email is None:
        email = f"test_{uuid.uuid4()}@test.com"
    return client.post("/auth/register", json={
        "email": email,
        "password": password,
        "full_name": "Test User"
    })

def test_register_success(client):
    res = create_user(client)
    assert res.status_code == 200
    data = res.json()
    assert data["token_type"] == "bearer"

def test_register_duplicates(client):
    create_user(client)
    res = create_user(client)
    assert res.status_code == 400
    assert "already" in res.json()["detail"].lower()

def test_register_invalid_data(client):
    res = client.post("/auth/register", json={
        "email":"invalid_email",
        "password":"4584",
        "full_name":"",
    })
    assert res.status_code == 422

### login test
def test_login_json_success(client):
    create_user(client)
    res = client.post("/auth/login", json={
        "email":"test@test.com",
        "password":"123456"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["token_type"] == "bearer"
    assert isinstance(data["access_token"], str)

def test_login_json_invalid(client):
    res = client.post("/auth/login", json={
        "email":"fake_user@test.com",
        "password":"123456"
    })
    assert res.status_code == 401
    assert res.json()["detail"] == "Invalid credentials"

def test_login_form_success(client):
    create_user(client)
    res = client.post("/auth/login-form", data={
        "username":"test@test.com",
        "password":"123456"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["token_type"] == "bearer"
    assert isinstance(data["access_token"], str)

def test_login_form_invalid(client):
    create_user(client)
    res = client.post("/auth/login-form", data={
        "username":"test@test.com",
        "password":"sdasfsdg"
    })
    assert res.status_code == 401

### check the token
def get_token(client):
    res = create_user(client)
    return res.json()["access_token"]

def test_get_me_success(client):
    token = get_token(client)

    res = client.get(
        "/auth/me",
        headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200

    data = res.json()
    assert data["email"] == "test@test.com"
    assert "employee_id" in data

def test_get_me_no_token(client):
    res = client.get("/auth/me")

    assert res.status_code == 401

def test_get_me_invalid_token(client):
    res = client.get(
        "/auth/me",
        headers={"Authorization": "Bearer invalidtoken"}
    )
    assert res.status_code == 401

def test_delete_user(client):
    res = create_user(client)
    token = res.json()["access_token"]

    me = client.get(
        "/auth/me",
        headers={"Authorization": f"Bearer {token}"}
    )

    user_id = me.json()["employee_id"]

    res = client.delete(
        f"/auth/users/{user_id}",
        headers={"Authorization": f"Bearer {token}"}
    )

    assert res.status_code == 200
    assert res.json()["message"] == "User deleted successfully"