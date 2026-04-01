from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from uuid import UUID
from app.db.session import get_db
from app.schemas.leave import LeaveCreate, LeaveOut
from app.services import leave_service
from app.api.v1.deps import get_current_user
from app.core.permissions import require_role
from app.core.constants import ROLE_MANAGER, ROLE_HR, ROLE_ADMIN
from app.models.user import User


router = APIRouter(prefix="/leaves", tags=["leaves"])


@router.post("/apply", response_model=LeaveOut)
def apply_leave(leave_in: LeaveCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return leave_service.apply_leave(db, current_user.id, leave_in)


@router.get("/me", response_model=list[LeaveOut])
def my_leaves(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return leave_service.get_my_leaves(db, current_user.id)


@router.get("/team", response_model=list[LeaveOut])
def team_leaves(status: str | None = None, db: Session = Depends(get_db),
                current_user: User = Depends(get_current_user)):
    require_role(current_user.role, [ROLE_MANAGER, ROLE_HR, ROLE_ADMIN])
    return leave_service.get_team_leaves(db, current_user.id, status=status)


@router.post("/{leave_id}/action", response_model=LeaveOut)
def action_leave(leave_id: UUID, approve: bool, db: Session = Depends(get_db),
                 current_user: User = Depends(get_current_user)):
    require_role(current_user.role, [ROLE_MANAGER, ROLE_HR, ROLE_ADMIN])

    leave = leave_service.approve_leave(db, leave_id, current_user.id, approve)
    if not leave:
        raise HTTPException(status_code=404, detail="Leave not found")
    return leave