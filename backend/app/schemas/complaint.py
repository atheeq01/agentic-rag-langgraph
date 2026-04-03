from pydantic import BaseModel,ConfigDict
from uuid import UUID
from datetime import datetime

class ComplaintCreate(BaseModel):
    title: str
    description: str
    priority: str
    against_user_id: UUID | None = None
    is_anonymous: bool = False

class ComplaintUpdate(BaseModel):
    status: str
    resolution_note: str|None = None

class ComplaintOut(BaseModel):
    id: UUID
    title: str
    description: str
    priority: str
    status: str
    is_anonymous: bool
    resolution_notes: str | None = None
    created_at: datetime
    against_user_id: UUID | None = None

    model_config = ConfigDict(from_attributes=True)
