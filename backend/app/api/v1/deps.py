from uuid import UUID
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.security import decode_access_token
from app.models.user import User
from uuid import UUID

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login-form")

def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:

    payload = decode_access_token(token)

    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )

    try:
        user_id = UUID(payload.get("sub"))  # 🔥 FIX HERE
    except Exception:
        raise HTTPException(
            status_code=401,
            detail="Invalid token payload"
        )

    user_id = UUID(payload.get("sub"))

    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(
            status_code=401,
            detail="User not found"
        )

    return user

def get_current_admin(current_user: User = Depends(get_current_user)) -> User:
    """Dependency to ensure the current user has admin privileges."""
    if current_user.role not in ["admin", "hr"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to perform this action."
        )
    return current_user