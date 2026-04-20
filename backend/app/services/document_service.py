import os
import tempfile
import uuid
from fastapi import UploadFile
from sqlalchemy.orm import Session
from sqlalchemy import select
from google.cloud import storage
from google.api_core.exceptions import Conflict

from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter

from app.models.document import Document
from app.ai.rag.vector_store import vector_store, index

storage_client = storage.Client()
BUCKET_NAME = os.getenv("GCS_BUCKET_NAME", "my-enterprise-hr-docs")

def upload_and_process_document(db: Session, file: UploadFile, user_id: uuid.UUID):
    doc_id = uuid.uuid4()
    blob_name = f"hr_policies/{doc_id}/{file.filename}"

    temp_pdf = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
    content = file.file.read()
    temp_pdf.write(content)
    temp_pdf.close()

    try:
        bucket = storage_client.bucket(BUCKET_NAME)

        if not bucket.exists():
            print(f"Bucket '{BUCKET_NAME}' not found! Auto-creating multi-region bucket...")
            try:
                bucket = storage_client.create_bucket(bucket, location="ASIA")
                print(f"Successfully created multi-region bucket: {BUCKET_NAME}")
            except Conflict:
                raise Exception(f"Bucket name '{BUCKET_NAME}' is already taken globally. Please change GCS_BUCKET_NAME in your .env file to something unique.")


        blob = bucket.blob(blob_name)
        blob.upload_from_filename(temp_pdf.name)
        gcs_uri = f"gs://{BUCKET_NAME}/{blob_name}"

        loader = PyPDFLoader(temp_pdf.name)
        raw_docs = loader.load()

        text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
        chunks = text_splitter.split_documents(raw_docs)

        for chunk in chunks:
            chunk.metadata["document_id"] = str(doc_id)
            chunk.metadata["filename"] = file.filename

        vector_store.add_documents(chunks)

        new_doc = Document(id=doc_id, filename=file.filename, gcs_uri=gcs_uri, uploaded_by=user_id)
        db.add(new_doc)
        db.commit()
        db.refresh(new_doc)

        return new_doc

    finally:
        os.remove(temp_pdf.name)


def get_all_documents(db: Session):
    stmt = select(Document).order_by(Document.created_at.desc())
    return db.scalars(stmt).all()


def get_document_view_url(db: Session, doc_id: uuid.UUID):
    doc = db.scalar(select(Document).where(Document.id == doc_id))
    if not doc:
        return None

    bucket = storage_client.bucket(BUCKET_NAME)
    blob = bucket.blob(f"hr_policies/{doc.id}/{doc.filename}")
    return blob.generate_signed_url(version="v4", expiration=900, method="GET")


def delete_document(db: Session, doc_id: uuid.UUID):
    doc = db.scalar(select(Document).where(Document.id == doc_id))
    if not doc:
        return False

    try:
        index.delete(filter={"document_id": str(doc_id)})
        print(f"🗑️ Pinecone chunks deleted for doc: {doc_id}")
    except Exception as e:
        print(f"Warning: Pinecone Delete failed: {e}")

    try:
        bucket = storage_client.bucket(BUCKET_NAME)
        if bucket.exists():
            blob = bucket.blob(f"hr_policies/{doc.id}/{doc.filename}")
            blob.delete()
            print(f"GCS file deleted for doc: {doc_id}")
    except Exception as e:
        print(f"Warning: GCS Delete failed: {e}")

    db.delete(doc)
    db.commit()
    return True