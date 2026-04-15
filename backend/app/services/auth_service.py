from sqlalchemy.orm import Session
from sqlalchemy import select
from app.models.user import User
from app.core.security import hash_password, verify_password, create_access_token


def create_user(db: Session, email: str, password: str, full_name: str | None = None, role: str = "employee"):
    hashed_password = hash_password(password)
    user = User(email=email, password_hash=hashed_password, full_name=full_name, role=role)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

def authenticate_user(db: Session, email: str, password: str):
    stmt = select(User).where(User.email == email)
    user = db.scalar(stmt)

    if not user or not verify_password(password, user.password_hash):
        return None
    return user

def create_user_token(user):
    data = {"sub": str(user.id), "role": user.role}
    return create_access_token(data)

def delete_user(db, user_id):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return None

    db.delete(user)
    db.commit()
    return True