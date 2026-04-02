from pydantic import BaseModel,ConfigDict
from uuid import UUID
from datetime import datetime

class ChatMessageBase(BaseModel):
    role: str
    content: str
    meta_data: dict | None = None

class ChatMessageCreate(ChatMessageBase):
    session_id: UUID

class ChatMessageOut(ChatMessageBase):
    id: UUID
    session_id: UUID
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class ChatSessionOut(BaseModel):
    id: UUID
    user_id: UUID
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class FeedbackCreate(BaseModel):
    rating: int
    reason: str |None = None