from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.models.user import User
from datetime import datetime, timedelta, timezone, tzinfo
from app.core.security import hash_password, verify_password, create_access_token,validate_password_complexity
from app.models.user import PasswordHistory

MAX_FAILED_ATTEMPTS = 5
LOCKOUT_DURATION_MINUTES = 15
PASSWORD_EXPIRATION_DAYS = 90

def create_user(db: Session, email: str, password: str, full_name: str | None = None, role: str = "employee"):
    validate_password_complexity(password)

    hashed_password = hash_password(password)
    user = User(
        email=email,
        password_hash=hashed_password,
        full_name=full_name,
        role=role,
        password_changed_at=datetime.now(timezone.utc)
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    history = PasswordHistory(user_id=user.id, password_hash=hashed_password)
    db.add(history)
    db.commit()
    return user

def authenticate_user(db: Session, email: str, password: str):
    stmt = select(User).where(User.email == email)
    user = db.scalar(stmt)

    if not user:
        return None, "Invalid credentials", False

    if not user.is_active:
        return None, "Account is disabled. Please contact an administrator.", False

    # check the account lock or not
    if user.account_locked_until:
        if user.account_locked_until.replace(tzinfo=timezone.utc) > datetime.now(timezone.utc):
            return None, "Account is temporarily locked due to multiple failed login attempts.", False
        else:
            user.account_locked_until = None
            user.failed_login_attempts = 0
    # verify the password and save the failed attempts
    if not verify_password(password, user.password_hash):
        user.failed_login_attempts += 1
        error_msg = "Invalid credentials"

        if user.failed_login_attempts >= MAX_FAILED_ATTEMPTS:
            user.account_locked_until = datetime.now(timezone.utc) + timedelta(minutes=LOCKOUT_DURATION_MINUTES)
            error_msg = f"Account locked due to {MAX_FAILED_ATTEMPTS} failed login attempts. Try again in {LOCKOUT_DURATION_MINUTES} minutes."
        db.commit()
        return None, error_msg, False

    user.failed_login_attempts = 0
    user.account_locked_until = None
    db.commit()
    needs_reset=False
    if user.password_changed_at:
        days_since_change = (datetime.now(timezone.utc) - user.password_changed_at.replace(tzinfo=timezone.utc)).days
        if days_since_change >= PASSWORD_EXPIRATION_DAYS:
            needs_reset = True
    return user, None, needs_reset


def change_password(db: Session, user: User, old_password: str, new_password: str):
    """Handles password rotation, verifying the old password, and preventing reuse."""
    if not verify_password(old_password, user.password_hash):
        return False, "Incorrect current password."

    validate_password_complexity(new_password)

    stmt = select(PasswordHistory).where(PasswordHistory.user_id == user.id)
    past_passwords = db.scalars(stmt).all()

    for record in past_passwords:
        if verify_password(new_password, record.password_hash):
            return False, "You cannot reuse a previously used password."

    new_hashed = hash_password(new_password)
    user.password_hash = new_hashed
    user.password_changed_at = datetime.now(timezone.utc)

    history = PasswordHistory(user_id=user.id, password_hash=new_hashed)
    db.add(history)
    db.commit()

    return True, "Password updated successfully."

def create_user_token(user):
    data = {"sub": str(user.id), "role": user.role}
    return create_access_token(data)


def unlock_user_account(db: Session, target_user_id: UUID):
    """Manually unlocks a user account and ensures it is active."""
    stmt = select(User).where(User.id == target_user_id)
    user = db.scalar(stmt)

    if not user:
        return False, "User not found."

    # Reset the security locks
    user.failed_login_attempts = 0
    user.account_locked_until = None
    user.is_active = True  # Ensure the account is active

    db.commit()
    return True, f"Account for {user.email} has been successfully unlocked."