from pydantic import BaseModel, ConfigDict
from uuid import UUID
from datetime import datetime

class DocumentOut(BaseModel):
    id: UUID
    filename: str
    gcs_uri: str
    uploaded_by: UUID | None
    created_at: datetime

    # This allows Pydantic to read data directly from the SQLAlchemy model
    model_config = ConfigDict(from_attributes=True)

class DocumentUploadOut(BaseModel):
    message: str
    id: UUID

class DocumentViewOut(BaseModel):
    view_url: str

class GenericMessageOut(BaseModel):
    message: str