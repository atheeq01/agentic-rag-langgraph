import uuid
from datetime import datetime
from sqlalchemy import String, ForeignKey, DateTime, JSON ,Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.db.session import Base

class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True,default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="chat_sessions")
    messages = relationship("ChatMessage", back_populates="session",cascade="all, delete-orphan")

class ChatMessage(Base):
    __tablename__ = "chat_messages"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True,default=uuid.uuid4)
    session_id:Mapped[uuid.UUID] = mapped_column(ForeignKey("chat_sessions.id", ondelete="CASCADE"), nullable=False)
    role: Mapped[str] = mapped_column(String(20))
    content: Mapped[str] = mapped_column(String)
    meta_data: Mapped[dict|None] = mapped_column(JSON,nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    session = relationship("ChatSession", back_populates="messages")
    feedback = relationship("MessageFeedback", back_populates="message", cascade="all, delete-orphan", uselist=False)

class MessageFeedback(Base):
    __tablename__ = "message_feedbacks"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True,default=uuid.uuid4)
    message_id:Mapped[uuid.UUID] = mapped_column(ForeignKey("chat_messages.id",ondelete="CASCADE"), nullable=False)
    rating: Mapped[bool] = mapped_column(Boolean, nullable=False)
    reason: Mapped[str] = mapped_column(String,nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True),server_default=func.now())

    message = relationship("ChatMessage", back_populates="feedback")
