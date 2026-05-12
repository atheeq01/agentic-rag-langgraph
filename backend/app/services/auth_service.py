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


# create a new user from the register page
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

# login page authentication
def authenticate_user(db: Session, email: str, password: str):
    stmt = select(User).where(User.email == email)
    user = db.scalar(stmt)

    # check the user is existing or not
    if not user:
        return None, "Invalid credentials.", False

    # check the user is lock or not
    if not user.is_active:
        return None, "Account is disabled. Please contact an administrator.", False

    # check the user is lock or not and how much time left to unlock
    if user.account_locked_until:
        now = datetime.now(timezone.utc)
        locked_until = user.account_locked_until.replace(tzinfo=timezone.utc)

        if locked_until > now:
            remaining = locked_until - now
            minutes = int(remaining.total_seconds() // 60)
            seconds = int(remaining.total_seconds() % 60)
            return None, f"Account locked. Try again in {minutes}m {seconds}s.", False
        else:
            user.account_locked_until = None
            user.failed_login_attempts = 0
            db.commit()

    # verify password and track remaining tries
    if not verify_password(password, user.password_hash):
        user.failed_login_attempts += 1
        remaining_tries = MAX_FAILED_ATTEMPTS - user.failed_login_attempts

        if user.failed_login_attempts >= MAX_FAILED_ATTEMPTS:
            user.account_locked_until = datetime.now(timezone.utc) + timedelta(minutes=LOCKOUT_DURATION_MINUTES)
            error_msg = f"Account locked for {LOCKOUT_DURATION_MINUTES} minutes due to excessive failed attempts."
        else:
            error_msg = f"Invalid credentials. {remaining_tries} attempts remaining."

        db.commit()
        return None, error_msg, False

    # reset the failed attempts and reset the lock time
    user.failed_login_attempts = 0
    user.account_locked_until = None
    db.commit()
    needs_reset = False
    if user.password_changed_at:
        days_since_change = (datetime.now(timezone.utc) - user.password_changed_at.replace(tzinfo=timezone.utc)).days
        if days_since_change >= PASSWORD_EXPIRATION_DAYS:
            needs_reset = True
    return user, None, needs_reset

# change the password
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

# create the user token
def create_user_token(user):
    data = {"sub": str(user.id), "role": user.role}
    return create_access_token(data)

# unlock the user (admin only)
def unlock_user_account(db: Session, target_user_id: UUID):
    """Manually unlocks a user account and ensures it is active."""
    stmt = select(User).where(User.id == target_user_id)
    user = db.scalar(stmt)

    if not user:
        return False, "User not found."

    # reset the security locks
    user.failed_login_attempts = 0
    user.account_locked_until = None
    user.is_active = True  # Ensure the account is active

    db.commit()
    return True, f"Account for {user.email} has been successfully unlocked."