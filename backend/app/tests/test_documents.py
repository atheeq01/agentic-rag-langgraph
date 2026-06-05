import pytest
import base64
from sqlalchemy import select
import uuid

from app.models.document import Document
from app.models.user import User

MINIMAL_PDF_B64 = "JVBERi0xLjQKJcOkw7zDtsOfCjIgMCBvYmoKPDwvTGVuZ3RoIDMgMCBSL0ZpbHRlci9GbGF0ZURlY29kZT4+CnN0cmVhbQp4nDPQM1Qo5ypUMFAwALJMLU31jBQsTAz1LBSKUrnCtRTc0xLzSlLz4k24ihkYgBgIUFxYgAAAE3YKvQplbmRzdHJlYW0KZW5kb2JqCgozIDAgb2JqCjQyCmVuZG9iagoKMSAwIG9iago8PC9UeXBlL1BhZ2UvTWVkaWFCb3hbMCAwIDU5NSA4NDJdL1BhcmVudCA0IDAgUi9SZXNvdXJjZXM8PC9Gb250PDwvRjEgNSAwIFI+Pj4+L0NvbnRlbnRzIDIgMCBSPj4KZW5kb2JqCgo0IDAgb2JqCjw8L1R5cGUvUGFnZXMvQ291bnQgMS9LaWRzWzEgMCBSXT4+CmVuZG9iagoKNSAwIG9iago8PC9UeXBlL0ZvbnQvU3VidHlwZS9UeXBlMS9CYXNlRm9udC9IZWx2ZXRpY2E+PgplbmRvYmoKCjYgMCBvYmoKPDwvVHlwZS9DYXRhbG9nL1BhZ2VzIDQgMCBSPj4KZW5kb2JqCgp4cmVmCjAgNwowMDAwMDAwMDAwIDY1NTM1IGYgCjAwMDAwMDAxMjIgMDAwMDAgbiAKMDAwMDAwMDAxOSAwMDAwMCBuIAowMDAwMDAwMTAxIDAwMDAwIG4gCjAwMDAwMDAyMTkgMDAwMDAgbiAKMDAwMDAwMDI3NiAwMDAwMCBuIAowMDAwMDAwMzY0IDAwMDAwIG4gCnRyYWlsZXIKPDwvU2l6ZSA3L1Jvb3QgNiAwIFI+PgpzdGFydHhyZWYKNDEzCiUlRU9GCg=="


# --- Helper Functions ---

def get_token_for(client, db, email, role="employee"):
    client.post("/auth/register", json={
        "email": email,
        "password": "TestPass@123",
        "full_name": "Test User"
    })

    user = db.scalar(select(User).where(User.email == email))
    if user:
        user.role = role
        db.commit()

    res = client.post("/auth/login", json={"email": email, "password": "TestPass@123"})
    return res.json()["access_token"]


def auth_header(token):
    return {"Authorization": f"Bearer {token}"}


# --- Tests ---

def test_real_upload_and_delete_document(client, db):
    """
    Tests the full REAL flow:
    1. Uploads to real GCP bucket
    2. Vectorizes using real Gemini Embeddings into real Pinecone DB
    3. Deletes entirely from all 3 systems to keep the environment clean.
    """
    hr_token = get_token_for(client, db, "hr_docs@test.com", role="hr")

    # Decode the real blank PDF back into bytes
    pdf_content = base64.b64decode(MINIMAL_PDF_B64)

    # 1. UPLOAD
    upload_res = client.post(
        "/documents/upload",
        files={"file": ("real_test_handbook.pdf", pdf_content, "application/pdf")},
        headers=auth_header(hr_token)
    )

    assert upload_res.status_code in [200, 201]

    # FIX: Convert the JSON string into a true Python UUID object
    doc_id_str = upload_res.json()["id"]
    doc_uuid = uuid.UUID(doc_id_str)

    # Verify it hit the SQLite Database using the doc_uuid
    uploaded_doc = db.scalar(select(Document).where(Document.id == doc_uuid))
    assert uploaded_doc is not None
    assert uploaded_doc.gcs_uri.startswith("gs://")

    # 2. CLEANUP
    delete_res = client.delete(f"/documents/{doc_uuid}", headers=auth_header(hr_token))

    assert delete_res.status_code == 200

    # Verify it is gone from the database
    deleted_doc = db.scalar(select(Document).where(Document.id == doc_uuid))
    assert deleted_doc is None