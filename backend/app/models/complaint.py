import uuid
from datetime import datetime
from sqlalchemy import String, Text, ForeignKey, Boolean, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.session import Base


class Complaint(Base):
    __tablename__ = "complaints"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    user_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    against_user_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"),
                                                              nullable=True)
    title: Mapped[str] = mapped_column(Text)
    description: Mapped[str] = mapped_column(Text)

    priority: Mapped[str] = mapped_column(String(20))
    status: Mapped[str] = mapped_column(String(50), default="open")
    is_anonymous: Mapped[bool] = mapped_column(Boolean, default=False)
    resolution_note: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user = relationship(
        "User",
        foreign_keys=[user_id],
        back_populates="complaints_filed"
    )

    against_user = relationship(
        "User",
        foreign_keys=[against_user_id],
        back_populates="complaints_received"
    )