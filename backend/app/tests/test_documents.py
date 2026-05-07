import pytest
from sqlalchemy import select
from app.models.user import User


def get_token_for(client, db, email, role="employee"):
    client.post("/auth/register", json={"email": email, "password": "123", "full_name": "Test"})
    user = db.scalar(select(User).where(User.email == email))
    if user:
        user.role = role
        db.commit()
    return client.post("/auth/login", json={"email": email, "password": "123"}).json()["access_token"]


def auth_header(token):
    return {"Authorization": f"Bearer {token}"}


def test_upload_document_invalid_extension(client, db):
    hr_token = get_token_for(client, db, "hr@test.com", role="hr")

    res = client.post(
        "/documents/upload",
        files={"file": ("test.txt", b"dummy content", "text/plain")},
        headers=auth_header(hr_token)
    )

    assert res.status_code == 400
    assert "Only PDF" in res.json()["detail"]


def test_documents_access_forbidden_for_employee(client, db):
    emp_token = get_token_for(client, db, "emp@test.com", role="employee")

    res = client.get("/documents/", headers=auth_header(emp_token))
    assert res.status_code == 403