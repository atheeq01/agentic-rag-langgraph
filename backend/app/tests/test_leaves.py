import pytest
from sqlalchemy import select
from app.models.user import User

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

def get_token_for(client, db, email, role="employee"):
    create_user(client, email=email)

    user = db.scalar(select(User).where(User.email == email))
    if user:
        user.role = role
        db.commit()

    res = login(client, email)
    return res.json()["access_token"]


def auth_header(token):
    return {"Authorization": f"Bearer {token}"}

def apply_leave(client, token):
    return client.post(
        "/leaves/apply",
        json={
            "start_date": "2026-04-20",
            "end_date": "2026-04-22",
            "leave_type": "annual",
            "reason": "Vacation"
        },
        headers=auth_header(token)
    )

### manager access test
def test_manager_can_view_team_leaves(client, db):
    manager_token = get_token_for(client, db, "manager@test.com", role="manager")

    create_user(client, "emp1@test.com")

    emp = db.scalar(select(User).where(User.email == "emp1@test.com"))
    manager = db.scalar(select(User).where(User.email == "manager@test.com"))

    emp.manager_id = manager.id
    db.commit()

    emp_token = login(client, "emp1@test.com").json()["access_token"]
    apply_leave(client, emp_token)

    res = client.get("/leaves/team", headers=auth_header(manager_token))

    assert res.status_code == 200
    assert len(res.json()) >= 1

def test_manager_cannot_view_non_team_leaves(client, db):
    manager_token = get_token_for(client, db, "manager2@test.com", role="manager")

    emp_token = get_token_for(client, db, "emp2@test.com", role="employee")
    apply_leave(client, emp_token)

    res = client.get("/leaves/team", headers=auth_header(manager_token))

    assert res.status_code == 200
    assert len(res.json()) == 0

### check the approval
def test_manager_can_approve_team_leave(client, db):
    manager_token = get_token_for(client, db, "manager3@test.com", role="manager")

    create_user(client, "emp3@test.com")

    emp = db.scalar(select(User).where(User.email == "emp3@test.com"))
    manager = db.scalar(select(User).where(User.email == "manager3@test.com"))

    emp.manager_id = manager.id
    db.commit()

    emp_token = login(client, "emp3@test.com").json()["access_token"]
    leave = apply_leave(client, emp_token).json()

    res = client.post(
        f"/leaves/{leave['id']}/action?approve=true",
        headers=auth_header(manager_token)
    )

    assert res.status_code == 200
    assert res.json()["status"] == "approved"

def test_manager_cannot_approve_outside_team(client, db): # added db here
    manager_token = get_token_for(client, db, "manager4@test.com", role="manager")
    emp_token = get_token_for(client, db, "emp4@test.com", role="employee")

    leave = apply_leave(client, emp_token).json()

    res = client.post(
        f"/leaves/{leave['id']}/action?approve=true",
        headers=auth_header(manager_token)
    )

    assert res.status_code in [403, 404]

### hr/admin test

def test_hr_can_view_all_leaves(client, db): # added db here
    hr_token = get_token_for(client, db, "hr@test.com", role="hr")

    emp_token = get_token_for(client, db, "emp5@test.com")
    apply_leave(client, emp_token)

    res = client.get("/leaves/team", headers=auth_header(hr_token))

    assert res.status_code == 200
    assert len(res.json()) >= 1

def test_admin_can_approve_any_leave(client, db): # added db here
    admin_token = get_token_for(client, db, "admin@test.com", role="admin")
    emp_token = get_token_for(client, db, "emp6@test.com")

    leave = apply_leave(client, emp_token).json()

    res = client.post(
        f"/leaves/{leave['id']}/action?approve=true",
        headers=auth_header(admin_token)
    )

    assert res.status_code == 200
    assert res.json()["status"] == "approved"