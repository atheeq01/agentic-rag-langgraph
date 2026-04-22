from sqlalchemy.orm import Session
from sqlalchemy import select
from app.models.user import User
from app.core.security import hash_password

def create_user(db: Session, email: str, password: str, full_name: str | None = None, role: str = "employee"):
    hashed_password = hash_password(password)
    user = User(email=email, password_hash=hashed_password, full_name=full_name, role=role)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

def get_user_by_id(db: Session, user_id):
    return db.get(User, user_id)

def delete_user(db: Session, user_id):
    user = get_user_by_id(db, user_id)
    if not user:
        return False
    db.delete(user)
    db.commit()
    return True

def update_user_password(db: Session, user_id, new_password: str):
    user = get_user_by_id(db, user_id)
    if not user:
        return None
    user.password_hash = hash_password(new_password)
    db.commit()
    db.refresh(user)
    return user

def update_user_role(db: Session, user_id, role: str):
    user = get_user_by_id(db, user_id)
    if not user:
        return None
    user.role = role
    db.commit()
    db.refresh(user)
    return user

def update_user_manager(db: Session, user_id, manager_id):
    user = get_user_by_id(db, user_id)
    if not user:
        return None
    user.manager_id = manager_id
    db.commit()
    db.refresh(user)
    return user