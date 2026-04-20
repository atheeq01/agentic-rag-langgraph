from datetime import datetime, timezone
from sqlalchemy import select
from sqlalchemy.orm import Session
from uuid import UUID

from app.models.leave import Leave
from app.models.user import User
from app.schemas.leave import LeaveCreate

def apply_leave(db: Session, user_id: UUID, leave_in: LeaveCreate):
    leave = Leave(
        user_id=user_id,
        start_date=leave_in.start_date,
        end_date=leave_in.end_date,
        leave_type=leave_in.leave_type,
        reason=leave_in.reason,
        status="pending"
    )
    db.add(leave)
    db.commit()
    db.refresh(leave)
    return leave

def get_my_leaves(db: Session, user_id: UUID):
    stmt = select(Leave).where(Leave.user_id == user_id)
    return db.scalars(stmt).all()

def get_team_leaves(db: Session, requester_id: UUID, status: str | None = None):
    stmt_requester = select(User).where(User.id == requester_id)
    requester = db.scalar(stmt_requester)

    if not requester:
        return []

    stmt = select(Leave)

    if requester.role in ["admin", "hr"]:
        pass
    elif requester.role == "manager":
        stmt = stmt.where(
            Leave.user_id.in_(
                select(User.id).where(User.manager_id == requester_id)
            )
        )
    else:
        return []

    if status:
        stmt = stmt.where(Leave.status == status)

    return db.scalars(stmt).all()

def approve_leave(db: Session, leave_id: UUID, approver_id: UUID, approve: bool):
    stmt_approver = select(User).where(User.id == approver_id)
    approver = db.scalar(stmt_approver)

    if not approver:
        return None

    stmt_leave = select(Leave).where(Leave.id == leave_id)
    leave = db.scalar(stmt_leave)

    if not leave:
        return None

    if approver.role == "manager":
        # Updated to 2.x style
        stmt_employee = select(User).where(User.id == leave.user_id)
        employee = db.scalar(stmt_employee)

        if not employee or employee.manager_id != approver_id:
            return None

    leave.status = "approved" if approve else "rejected"
    leave.approved_by = approver_id
    leave.approved_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(leave)
    return leave