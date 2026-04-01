from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session
from app.models.leave import Leave
from app.schemas.leave import LeaveCreate
from uuid import UUID

def apply_leave(db: Session,user_id:UUID, leave_in: LeaveCreate):
    leave = Leave(
        user_id=user_id,
        start_date=leave_in.start_date,
        end_date=leave_in.end_date,
        leave_type=leave_in.leave_type,
        reason=leave_in.reason
    )
    db.add(leave)
    db.commit()
    db.refresh(leave)
    return leave

def get_my_leaves(db: Session, user_id:UUID):
    stmt = select(Leave).where(Leave.user_id == user_id)
    return db.scalars(stmt).all()

def get_team_leaves(db: Session, manager_id:UUID,status:str|None = None):
    stmt = select(Leave)
    if status :
        stmt = stmt.where(Leave.status == status)
    return db.scalars(stmt).all()


def approve_leave(db: Session, leave_id: UUID, approver_id: UUID, approve: bool):
    stmt = select(Leave).where(Leave.id == leave_id)
    leave = db.scalar(stmt)

    if not leave:
        return None

    leave.status = "approved" if approve else "rejected"
    leave.approved_by = approver_id

    # NEW: Record the exact time the action was taken
    leave.approved_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(leave)
    return leave