from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from uuid import UUID

from app.api.v1.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.core.permissions import require_role
from app.core.constants import ROLE_HR, ROLE_ADMIN
from app.services import document_service

from app.schemas.document import DocumentOut, DocumentUploadOut, DocumentViewOut, GenericMessageOut

router = APIRouter(prefix="/documents", tags=["Documents"])


@router.post("/upload", response_model=DocumentUploadOut)
async def upload_doc(
        file: UploadFile = File(...),
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    require_role(current_user.role, [ROLE_HR, ROLE_ADMIN])
    if not file.filename:
        raise HTTPException(status_code=400, detail="Filename missing.")
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    # Magic Bytes verification
    header = await file.read(4)
    if header != b"%PDF":
        raise HTTPException(status_code=400, detail="Invalid file format. Only true PDF files are supported.")
    await file.seek(0)
    
    # File size limit (5MB)
    file_size = 0
    chunk_size = 1024 * 1024
    while chunk := await file.read(chunk_size):
        file_size += len(chunk)
        if file_size > 5 * 1024 * 1024:
            raise HTTPException(status_code=413, detail="File too large. Maximum size is 5MB.")
    await file.seek(0)

    doc = document_service.upload_and_process_document(db, file, current_user.id)
    return {"message": "Document uploaded to GCP and Pinecone.", "id": doc.id}


@router.get("/", response_model=list[DocumentOut])
def list_docs(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    require_role(current_user.role, [ROLE_HR, ROLE_ADMIN])
    return document_service.get_all_documents(db)


@router.get("/{doc_id}/view", response_model=DocumentViewOut)
def view_doc(doc_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    require_role(current_user.role, [ROLE_HR, ROLE_ADMIN])
    url = document_service.get_document_view_url(db, doc_id)
    if not url:
        raise HTTPException(status_code=404, detail="Document not found")
    return {"view_url": url}


@router.delete("/{doc_id}", response_model=GenericMessageOut)
def delete_doc(doc_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    require_role(current_user.role, [ROLE_HR, ROLE_ADMIN])
    success = document_service.delete_document(db, doc_id)
    if not success:
        raise HTTPException(status_code=404, detail="Document not found")
    return {"message": "Document deleted entirely from DB, GCP, and Pinecone"}