from datetime import datetime, timezone, timedelta, date
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload
from uuid import UUID

from app.models.leave import Leave
from app.models.user import User
from app.schemas.leave import LeaveCreate
from fastapi import HTTPException

# Processes new leave applications and validates against notice and balance rules
def apply_leave(db: Session, user_id: UUID, leave_in: LeaveCreate):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    duration = (leave_in.end_date - leave_in.start_date).days + 1

    # Rule: Leaves > 3 days must be booked at least 14 days in advance
    if duration > 3:
        notice_deadline = date.today() + timedelta(days=14)
        if leave_in.start_date < notice_deadline:
            raise HTTPException(
                status_code=400,
                detail="Requests > 3 days require 14 days advance notice."
            )

    # Balance Check and Deduction
    if leave_in.leave_type == "annual":
        if user.annual_leave_balance < duration:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient Annual Leave. Balance: {user.annual_leave_balance}"
            )
        user.annual_leave_balance -= duration

    elif leave_in.leave_type == "sick":
        if user.sick_leave_balance < duration:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient Sick Leave. Balance: {user.sick_leave_balance}"
            )
        user.sick_leave_balance -= duration

    leave = Leave(**leave_in.model_dump(), user_id=user_id, status="pending")
    db.add(leave)
    db.commit()
    db.refresh(leave)
    return leave

# get the leave, who log in now
def get_my_leaves(db: Session, user_id: UUID):
    stmt = select(Leave).where(Leave.user_id == user_id).options(
        joinedload(Leave.user),
        joinedload(Leave.approver)
    )
    return db.scalars(stmt).all()

# view the leave based on user
def get_team_leaves(db: Session, requester_id: UUID, status: str | None = None):
    stmt_requester = select(User).where(User.id == requester_id)
    requester = db.scalar(stmt_requester)

    if not requester:
        return []

    stmt = select(Leave).options(
        joinedload(Leave.user),
        joinedload(Leave.approver)
    )
    """
    role: 
        - Admin/HR see all
        - Managers see team
    """
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

# handles approval or rejection ( manager)
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