import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Boolean, DateTime, Integer, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.session import Base


class User(Base):
    __tablename__ = "users"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True)
    password_hash: Mapped[str] = mapped_column(String)

    full_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    role: Mapped[str] = mapped_column(String(50), default="employee")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    manager_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)

    google_access_token: Mapped[str | None] = mapped_column(String, nullable=True)
    google_refresh_token: Mapped[str | None] = mapped_column(String, nullable=True)
    google_token_expiry: Mapped[str | None] = mapped_column(String, nullable=True)

    failed_login_attempts: Mapped[int] = mapped_column(Integer, default=0)
    account_locked_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    password_changed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True),
                                                          default=lambda: datetime.now(timezone.utc))

    leaves = relationship(
        "Leave",
        back_populates="user",
        foreign_keys="[Leave.user_id]"
    )
    approved_leaves = relationship(
        "Leave",
        back_populates="approver",
        foreign_keys="[Leave.approved_by]"
    )
    chat_sessions = relationship(
        "ChatSession",
        back_populates="user",
        cascade="all, delete-orphan"
    )
    complaints_filed = relationship(
        "Complaint",
        back_populates="user",
        foreign_keys="[Complaint.user_id]"
    )
    complaints_received = relationship(
        "Complaint",
        back_populates="against_user",
        foreign_keys="[Complaint.against_user_id]"
    )
    password_history: Mapped[list["PasswordHistory"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan"
    )


class PasswordHistory(Base):
    __tablename__ = "password_history"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    password_hash: Mapped[str] = mapped_column(String)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    user: Mapped["User"] = relationship(back_populates="password_history")