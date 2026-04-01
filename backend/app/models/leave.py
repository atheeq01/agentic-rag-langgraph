import uuid
from datetime import datetime, date
from sqlalchemy import String, DateTime, Boolean, Date, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.db.session import Base


class Leave(Base):
    __tablename__ = 'leaves'
    id: Mapped[UUID] = mapped_column(UUID, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[UUID] = mapped_column(ForeignKey('users.id', ondelete='CASCADE', onupdate='CASCADE'))

    start_date: Mapped[date] = mapped_column(Date)
    end_date: Mapped[date] = mapped_column(Date)

    leave_type: Mapped[str] = mapped_column(String(50))
    reason: Mapped[str|None] = mapped_column(String)
    status: Mapped[str] = mapped_column(String,default='pending')

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True),default=datetime.now)
    approved_by: Mapped[uuid.UUID|None] = mapped_column(ForeignKey('users.id'))
    approved_at: Mapped[datetime|None] = mapped_column(DateTime(timezone=True))

    user = relationship(
        "User",
        back_populates="leaves",
        foreign_keys=[user_id])
    approver = relationship(
        "User",
        back_populates="approved_leaves",
        foreign_keys=[approved_by])
