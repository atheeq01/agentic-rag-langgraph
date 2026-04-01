from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.schemas.auth import UserCreate, UserLogin, Token
from app.db.session import get_db
from app.services import auth_service
from app.models.user import User
from app.api.v1.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/register", response_model=Token)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    stmt = select(User).where(User.email == user_in.email)
    existing = db.scalar(stmt)

    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user = auth_service.create_user(db, email=user_in.email, password=user_in.password, full_name=user_in.full_name)
    token = auth_service.create_user_token(user)
    return {"access_token": token, "token_type": "bearer"}


@router.post("/login-form", response_model=Token)
def login(credentials: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = auth_service.authenticate_user(db, credentials.username, credentials.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = auth_service.create_user_token(user)
    return {"access_token": token, "token_type": "bearer"}

@router.post("/login", response_model=Token)
def login_json(credentials: UserLogin, db: Session = Depends(get_db)):
    user = auth_service.authenticate_user(db, credentials.email, credentials.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return {"access_token": auth_service.create_user_token(user), "token_type": "bearer"}


@router.get("/me", tags=["auth"])
def get_my_profile(current_user: User = Depends(get_current_user)):

    return {
        "message": "Authentication successful! The lock is working.",
        "employee_id": str(current_user.id),
        "email": current_user.email,
        "role": current_user.role
    }