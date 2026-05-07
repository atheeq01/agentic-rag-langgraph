import pytest
from sqlalchemy import select
from app.models.user import User


# --- Helper Functions ---

def create_user(client, email, password="password123", full_name="Test User"):
    return client.post("/auth/register", json={
        "email": email,
        "password": password,
        "full_name": full_name
    })


def login(client, email, password="password123"):
    return client.post("/auth/login", json={
        "email": email,
        "password": password
    })


def get_token_for(client, db, email, role="employee"):
    create_user(client, email)
    user = db.scalar(select(User).where(User.email == email))
    if user:
        user.role = role
        db.commit()
    return login(client, email).json()["access_token"]


def auth_header(token):
    return {"Authorization": f"Bearer {token}"}


# --- Tests ---

def test_create_user_admin(client, db):
    admin_token = get_token_for(client, db, "admin_create@test.com", role="admin")
    res = client.post("/users/", json={
        "email": "new_created_user@test.com",
        "password": "password123",
        "full_name": "New User",
        "role": "employee"
    }, headers=auth_header(admin_token))

    assert res.status_code == 200
    assert res.json()["email"] == "new_created_user@test.com"


def test_create_user_forbidden(client, db):
    emp_token = get_token_for(client, db, "emp_create@test.com", role="employee")
    res = client.post("/users/", json={
        "email": "newuser2@test.com",
        "password": "password123",
        "full_name": "New User",
        "role": "employee"
    }, headers=auth_header(emp_token))

    assert res.status_code == 403


def test_list_users(client, db):
    admin_token = get_token_for(client, db, "admin_list@test.com", role="admin")
    emp_token = get_token_for(client, db, "emp_list@test.com", role="employee")

    res_admin = client.get("/users/", headers=auth_header(admin_token))
    assert res_admin.status_code == 200
    assert isinstance(res_admin.json(), list)

    res_emp = client.get("/users/", headers=auth_header(emp_token))
    assert res_emp.status_code == 403


def test_change_password(client, db):
    token = get_token_for(client, db, "passuser@test.com")

    res = client.patch("/users/me/password", json={
        "old_password": "password123",
        "new_password": "newpassword456"
    }, headers=auth_header(token))

    assert res.status_code == 200

    res_login = login(client, "passuser@test.com", "newpassword456")
    assert res_login.status_code == 200


def test_update_role(client, db):
    admin_token = get_token_for(client, db, "admin_role@test.com", role="admin")
    create_user(client, "role_target@test.com")

    user = db.scalar(select(User).where(User.email == "role_target@test.com"))

    res = client.patch(f"/users/{user.id}/role", json={"role": "hr"}, headers=auth_header(admin_token))
    assert res.status_code == 200
    assert "Role updated to hr" in res.json()["message"]


def test_promote_user(client, db):
    admin_token = get_token_for(client, db, "admin_promote@test.com", role="admin")
    create_user(client, "promote_target@test.com")

    user = db.scalar(select(User).where(User.email == "promote_target@test.com"))

    res = client.patch(f"/users/{user.id}/promote", headers=auth_header(admin_token))
    assert res.status_code == 200
    assert "promoted to Manager" in res.json()["message"]


def test_assign_manager(client, db):
    admin_token = get_token_for(client, db, "admin_assign@test.com", role="admin")
    create_user(client, "manager@test.com")
    create_user(client, "employee_target@test.com")

    manager = db.scalar(select(User).where(User.email == "manager@test.com"))
    emp = db.scalar(select(User).where(User.email == "employee_target@test.com"))

    res = client.patch(f"/users/{emp.id}/manager", json={"manager_id": str(manager.id)},
                       headers=auth_header(admin_token))
    assert res.status_code == 200


def test_delete_user(client, db):
    admin_token = get_token_for(client, db, "admin_delete@test.com", role="admin")
    create_user(client, "delete_me@test.com")

    user_to_delete = db.scalar(select(User).where(User.email == "delete_me@test.com"))

    res = client.delete(f"/users/{user_to_delete.id}", headers=auth_header(admin_token))
    assert res.status_code == 200
    assert res.json()["message"] == "User deleted successfully"


def test_delete_admin_user_fails(client, db):
    admin_token = get_token_for(client, db, "admin_deleter@test.com", role="admin")
    get_token_for(client, db, "admin_target@test.com", role="admin")  # Creates an admin user

    target_admin = db.scalar(select(User).where(User.email == "admin_target@test.com"))

    res = client.delete(f"/users/{target_admin.id}", headers=auth_header(admin_token))
    assert res.status_code == 403
    assert "Cannot delete users with 'admin' or 'hr' roles" in res.json()["detail"]