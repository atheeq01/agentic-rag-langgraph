from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select
from typing import List
from uuid import UUID

from app.db.session import get_db
from app.models.user import User
from app.schemas.user import UserOut, UserUpdatePassword, UserUpdateRole, UserUpdateManager, UserAdminCreate
from app.api.v1.deps import get_current_user
from app.services import user_service
from app.core.security import verify_password

router = APIRouter(prefix="/users", tags=["users"])

# create a new user from the admin dashboard
@router.post("/", response_model=UserOut)
def create_user(
        user_in: UserAdminCreate,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can create users")

    return user_service.create_user(
        db,
        email=user_in.email,
        password=user_in.password,
        full_name=user_in.full_name,
        role=user_in.role
    )

# list users based on role
@router.get("/", response_model=List[UserOut])
def list_users(
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    if current_user.role in ["admin", "hr"]:
        stmt = select(User)
    elif current_user.role == "manager":
        stmt = select(User).where(User.manager_id == current_user.id)
    else:
        raise HTTPException(status_code=403, detail="Not authorized to list users")

    users = db.scalars(stmt).all()
    return users

# change user password
@router.patch("/me/password")
def change_password(
        password_in: UserUpdatePassword,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    if not verify_password(password_in.old_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Incorrect old password")

    user_service.update_user_password(db, current_user.id, password_in.new_password)
    return {"message": "Password updated successfully"}

# update user role (only admin)
@router.patch("/{user_id}/role")
def update_role(
        user_id: UUID,
        role_in: UserUpdateRole,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can update roles")

    user = user_service.update_user_role(db, user_id, role_in.role)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return {"message": f"Role updated to {role_in.role} for user {user.email}"}

# promote user to manager (only admin)
@router.patch("/{user_id}/promote")
def promote_user(
        user_id: UUID,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can promote users")

    user = user_service.update_user_role(db, user_id, "manager")
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return {"message": f"User {user.email} promoted to Manager"}

# delete the user (only admin)
@router.delete("/{user_id}")
def delete_user_api(
        user_id: UUID,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can delete users")

    target_user = user_service.get_user_by_id(db, user_id)
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    if target_user.role in ["admin", "hr"]:
        raise HTTPException(status_code=403, detail="Cannot delete users with 'admin' or 'hr' roles")

    user_service.delete_user(db, user_id)
    return {"message": "User deleted successfully"}

# assign to manager and department (only admin/hr)
@router.patch("/{user_id}/assign")
def assign_user_details(
        user_id: UUID,
        data: UserUpdateManager,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    if current_user.role not in ["admin", "hr"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    user = user_service.update_user_assignment(db, user_id, data.manager_id, data.department)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return {"message": "User assignment updated successfully"}

# deactivate user account (only admin)
@router.patch("/{user_id}/deactivate")
def deactivate_user(
        user_id: UUID,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can deactivate users")

    user = user_service.update_user_status(db, user_id, is_active=False)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return {"message": f"User {user.email} deactivated"}

# activate user account (only admin)
@router.patch("/{user_id}/activate")
def activate_user(
        user_id: UUID,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can activate users")

    user = user_service.update_user_status(db, user_id, is_active=True)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return {"message": f"User {user.email} activated"}