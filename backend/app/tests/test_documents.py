import pytest
import uuid
from unittest.mock import patch
from sqlalchemy import select

from app.models.document import Document
from app.models.user import User


# --- Helper Functions ---

def get_token_for(client, db, email, role="employee"):
    """Registers a user, assigns a role, and returns their JWT token."""
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

@patch("app.services.document_service.get_storage_client")
@patch("app.services.document_service.get_vector_store")
@patch("app.services.document_service.PyPDFLoader")
def test_upload_valid_pdf_document(mock_loader, mock_vector_store, mock_gcs, client, db):
    """Tests the document upload flow while mocking GCS and Pinecone vectorization."""
    # Setup mocks to prevent actual API calls
    mock_gcs.return_value.bucket.return_value.exists.return_value = True
    mock_loader.return_value.load.return_value = []

    hr_token = get_token_for(client, db, "hr_docs@test.com", role="hr")

    # Create a fake PDF byte stream
    pdf_content = b"%PDF-1.4\n%Fake PDF Content"

    res = client.post(
        "/documents/upload",
        files={"file": ("handbook.pdf", pdf_content, "application/pdf")},
        headers=auth_header(hr_token)
    )

    assert res.status_code in [200, 201]

    uploaded_doc = db.scalar(select(Document).where(Document.filename == "handbook.pdf"))

    assert uploaded_doc is not None
    assert uploaded_doc.gcs_uri.startswith("gs://")
    assert uploaded_doc.uploaded_by is not None


@patch("app.services.document_service.get_storage_client")
@patch("app.services.document_service.get_index")
def test_delete_document_removes_from_db(mock_index, mock_gcs, client, db):
    """Ensures HR can delete a document, which triggers the DB removal."""
    hr_token = get_token_for(client, db, "hr_deleter@test.com", role="hr")

    # First, inject a dummy document directly into the DB to test deletion
    from app.models.document import Document
    hr_user = db.scalar(select(User).where(User.email == "hr_deleter@test.com"))
    doc_id = uuid.uuid4()
    dummy_doc = Document(id=doc_id, filename="old_policy.pdf", gcs_uri="gs://bucket/old.pdf", uploaded_by=hr_user.id)
    db.add(dummy_doc)
    db.commit()

    res = client.delete(f"/documents/{doc_id}", headers=auth_header(hr_token))

    assert res.status_code == 200

    # Verify it is gone from the database
    deleted_doc = db.scalar(select(Document).where(Document.id == doc_id))
    assert deleted_doc is None