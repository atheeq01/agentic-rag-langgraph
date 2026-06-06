import pytest
from datetime import date, timedelta
from sqlalchemy import select
from app.models.user import User


# ------ TEST FIXTURES & HELPERS


# registers a new user and returns a valid Authorization header for the specified role
def get_auth(client, db, email, role="employee"):
    client.post("/auth/register", json={
        "email": email,
        "password": "TestPass@123",
        "full_name": "Test User"
    })
    user = db.scalar(select(User).where(User.email == email))
    user.role = role
    db.commit()

    res = client.post("/auth/login", json={"email": email, "password": "TestPass@123"})
    return {"Authorization": f"Bearer {res.json()['access_token']}"}


# Submits a leave request with standardized parameters and returns the raw response
def submit_leave(client, headers, start=None, end=None, leave_type="Annual"):
    if not start:
        # Default: a 3-day leave 20 days in the future (Passes notice check)
        start = (date.today() + timedelta(days=20)).isoformat()
        end = (date.today() + timedelta(days=22)).isoformat()

    res = client.post("/leaves/", json={
        "start_date": start,
        "end_date": end,
        "leave_type": leave_type,
        "reason": "Test Vacation"
    }, headers=headers)
    return res



# ------ LEAVE TEST CASES


# Verifies that an employee can successfully retrieve their own leave application history
def test_employee_can_view_personal_leave_history(client, db):
    headers = get_auth(client, db, "history@test.com")
    post_res = submit_leave(client, headers)

    # Assert 200 or 201 to stay compatible with standard and strict REST routers
    assert post_res.status_code in [200, 201]

    res = client.get("/leaves/me", headers=headers)
    assert res.status_code == 200
    assert len(res.json()) >= 1


# Validates that leaves exceeding 3 days are rejected if the 14-day notice period is violated
def test_long_leave_requires_advance_notice(client, db):
    headers = get_auth(client, db, "notice@test.com")

    # Requesting 5 days starting tomorrow (Violates notice rule)
    start = (date.today() + timedelta(days=1)).isoformat()
    end = (date.today() + timedelta(days=5)).isoformat()

    res = submit_leave(client, headers, start=start, end=end)
    assert res.status_code == 400
    assert "14 days advance notice" in res.json()["detail"]


# Ensures that applications are rejected when the requested duration exceeds the user's balance
def test_leave_application_fails_on_insufficient_balance(client, db):
    headers = get_auth(client, db, "broke@test.com")

    # Requesting 30 days (Default starting balance is typically 20)
    start = (date.today() + timedelta(days=20)).isoformat()
    end = (date.today() + timedelta(days=50)).isoformat()

    res = submit_leave(client, headers, start=start, end=end)
    assert res.status_code == 400
    assert "Insufficient Annual Leave" in res.json()["detail"]


# Confirms that managers can view leave requests submitted by their direct reports
def test_manager_access_is_restricted_to_direct_team(client, db):
    mgr_headers = get_auth(client, db, "mgr@test.com", role="manager")
    emp_headers = get_auth(client, db, "emp@test.com")

    mgr = db.scalar(select(User).where(User.email == "mgr@test.com"))
    emp = db.scalar(select(User).where(User.email == "emp@test.com"))
    emp.manager_id = mgr.id
    db.commit()

    submit_leave(client, emp_headers)

    res = client.get("/leaves/team", headers=mgr_headers)
    assert res.status_code == 200
    assert len(res.json()) == 1


# Verifies that managers are blocked from accessing or acting on leaves outside their team
def test_manager_cannot_act_on_external_leave_requests(client, db):
    mgr_headers = get_auth(client, db, "other_mgr@test.com", role="manager")
    emp_headers = get_auth(client, db, "outside_emp@test.com")

    post_res = submit_leave(client, emp_headers)
    assert post_res.status_code in [200, 201]
    leave_id = post_res.json()["id"]

    res = client.post(f"/leaves/{leave_id}/action?approve=true", headers=mgr_headers)
    assert res.status_code in [403, 404]


# Confirms that HR personnel have global visibility across all leave applications
def test_hr_has_global_visibility_of_leaves(client, db):
    hr_headers = get_auth(client, db, "hr_admin@test.com", role="hr")
    emp_headers = get_auth(client, db, "someone@test.com")

    submit_leave(client, emp_headers)

    res = client.get("/leaves/team", headers=hr_headers)
    assert res.status_code == 200
    assert len(res.json()) >= 1


# Validates that Admins can approve any leave regardless of department or hierarchy
def test_admin_can_approve_any_leave_request(client, db):
    admin_headers = get_auth(client, db, "super_admin@test.com", role="admin")
    emp_headers = get_auth(client, db, "sub@test.com")

    post_res = submit_leave(client, emp_headers)
    assert post_res.status_code in [200, 201]
    leave_id = post_res.json()["id"]

    res = client.post(f"/leaves/{leave_id}/action?approve=true", headers=admin_headers)
    assert res.status_code == 200
    assert res.json()["status"] == "approved"

# checking the balance of leaves while apply to the leave
def test_leave_application_deducts_balance_correctly(client, db):
    headers = get_auth(client, db, "deduction@test.com")
    user = db.scalar(select(User).where(User.email == "deduction@test.com"))

    initial_balance = user.annual_leave_balance

    start = (date.today() + timedelta(days=20)).isoformat()
    end = (date.today() + timedelta(days=22)).isoformat()

    res = submit_leave(client, headers, start=start, end=end, leave_type="Annual")
    assert res.status_code in [200, 201]
    leave_id = res.json()["id"]

    db.refresh(user)
    # Balance should NOT be deducted on application
    assert user.annual_leave_balance == initial_balance

    # Now approve it
    admin_headers = get_auth(client, db, "super_admin_deduct@test.com", role="admin")
    approve_res = client.post(f"/leaves/{leave_id}/action?approve=true", headers=admin_headers)
    assert approve_res.status_code == 200

    db.refresh(user)
    # Now it should be deducted
    assert user.annual_leave_balance == (initial_balance - 3)