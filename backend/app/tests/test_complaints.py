import pytest
from sqlalchemy import select
from app.models.user import User


# --- Helper Functions ---

# register a user for testing purposes
def register_test_user(client, email, role="employee"):
    return client.post("/auth/register", json={
        "email": email,
        "password": "TestPass@123",
        "full_name": "Test User"
    })


# login and return auth headers for a specific role
def get_auth_headers(client, db, email, role="employee"):
    register_test_user(client, email)
    user = db.scalar(select(User).where(User.email == email))
    user.role = role
    db.commit()

    login_res = client.post("/auth/login", json={"email": email, "password": "TestPass@123"})
    token = login_res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


# --- Tests ---

# check that admin can create new users manually
def test_create_user_admin(client, db):
    headers = get_auth_headers(client, db, "admin@test.com", "admin")
    res = client.post("/users/", json={
        "email": "manual@test.com",
        "password": "Password@123",
        "full_name": "Manual User",
        "role": "employee"
    }, headers=headers)
    assert res.status_code == 200


# check that non-admins are forbidden from creating users
def test_create_user_forbidden(client, db):
    headers = get_auth_headers(client, db, "staff@test.com", "employee")
    res = client.post("/users/", json={"email": "no@test.com", "password": "Password@123"}, headers=headers)
    assert res.status_code == 403


# check that admin/hr can list all users while employees cannot
def test_list_users_permissions(client, db):
    admin_headers = get_auth_headers(client, db, "admin_list@test.com", "admin")
    emp_headers = get_auth_headers(client, db, "emp_list@test.com", "employee")

    assert client.get("/users/", headers=admin_headers).status_code == 200
    assert client.get("/users/", headers=emp_headers).status_code == 403


# check that users can successfully update their own password
def test_change_password(client, db):
    headers = get_auth_headers(client, db, "pass@test.com")
    res = client.patch("/users/me/password", json={
        "old_password": "TestPass@123",
        "new_password": "NewPassword@123"
    }, headers=headers)
    assert res.status_code == 200


# check that admin can update a user's role
def test_update_role_admin(client, db):
    admin_headers = get_auth_headers(client, db, "admin_role@test.com", "admin")
    register_test_user(client, "target@test.com")
    target = db.scalar(select(User).where(User.email == "target@test.com"))

    res = client.patch(f"/users/{target.id}/role", json={"role": "hr"}, headers=admin_headers)
    assert res.status_code == 200
    assert "hr" in res.json()["message"]


# check user assignment (manager and department) via the consolidated route
def test_assign_user_details_admin_hr(client, db):
    admin_headers = get_auth_headers(client, db, "admin_assign@test.com", "admin")
    register_test_user(client, "manager@test.com")
    register_test_user(client, "subordinate@test.com")

    mgr = db.scalar(select(User).where(User.email == "manager@test.com"))
    sub = db.scalar(select(User).where(User.email == "subordinate@test.com"))

    # Test updating both department and manager
    res = client.patch(f"/users/{sub.id}/assign", json={
        "manager_id": str(mgr.id),
        "department": "financial"
    }, headers=admin_headers)

    assert res.status_code == 200
    db.refresh(sub)
    assert sub.department == "financial"
    assert sub.manager_id == mgr.id


# check account deactivation and activation (admin only)
def test_user_status_toggles(client, db):
    admin_headers = get_auth_headers(client, db, "admin_status@test.com", "admin")
    register_test_user(client, "toggle@test.com")
    target = db.scalar(select(User).where(User.email == "toggle@test.com"))

    # Deactivate
    res_de = client.patch(f"/users/{target.id}/deactivate", headers=admin_headers)
    assert res_de.status_code == 200
    db.refresh(target)
    assert target.is_active is False

    # Activate
    res_ac = client.patch(f"/users/{target.id}/activate", headers=admin_headers)
    assert res_ac.status_code == 200
    db.refresh(target)
    assert target.is_active is True


# check that admin can delete users but not other privileged roles
def test_delete_user_restrictions(client, db):
    admin_headers = get_auth_headers(client, db, "boss@test.com", "admin")

    # Create an employee and an HR user
    register_test_user(client, "kill_me@test.com")
    get_auth_headers(client, db, "safe_hr@test.com", "hr")

    emp = db.scalar(select(User).where(User.email == "kill_me@test.com"))
    hr_user = db.scalar(select(User).where(User.email == "safe_hr@test.com"))

    # Delete employee (Should work)
    assert client.delete(f"/users/{emp.id}", headers=admin_headers).status_code == 200

    # Delete HR (Should fail)
    res_hr = client.delete(f"/users/{hr_user.id}", headers=admin_headers)
    assert res_hr.status_code == 403