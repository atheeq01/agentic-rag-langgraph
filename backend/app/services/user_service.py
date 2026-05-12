from uuid import UUID
from sqlalchemy.orm import Session
from app.models.user import User
from app.core.security import hash_password

# create a new user from the admin dashboard
def create_user(db: Session, email: str, password: str, full_name: str | None = None,
                role: str = "employee", department: str | None = None, manager_id: UUID | None = None):
    hashed_password = hash_password(password)
    user = User(
        email=email,
        password_hash=hashed_password,
        full_name=full_name,
        role=role,
        department=department,
        manager_id=manager_id
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

# assign to manager and department (only admin/hr)
def update_user_assignment(db: Session, user_id: UUID, manager_id: UUID | None, department: str | None):
    user = get_user_by_id(db, user_id)
    if not user:
        return None
    if manager_id is not None: user.manager_id = manager_id
    if department is not None: user.department = department
    db.commit()
    db.refresh(user)
    return user

# get user by ID
def get_user_by_id(db: Session, user_id):
    return db.get(User, user_id)

# delete the user (only admin)
def delete_user(db: Session, user_id):
    user = get_user_by_id(db, user_id)
    if not user:
        return False
    db.delete(user)
    db.commit()
    return True

# update user password
def update_user_password(db: Session, user_id, new_password: str):
    user = get_user_by_id(db, user_id)
    if not user:
        return None
    user.password_hash = hash_password(new_password)
    db.commit()
    db.refresh(user)
    return user

# update the user role (only admin)
def update_user_role(db: Session, user_id, role: str):
    user = get_user_by_id(db, user_id)
    if not user:
        return None
    user.role = role
    db.commit()
    db.refresh(user)
    return user

# update user active status (only admin)
def update_user_status(db: Session, user_id: UUID, is_active: bool):
    user = get_user_by_id(db, user_id)
    if not user:
        return None
    user.is_active = is_active
    db.commit()
    db.refresh(user)
    return user