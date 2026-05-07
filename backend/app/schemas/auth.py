from pydantic import BaseModel, EmailStr, ConfigDict
from uuid import UUID

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str | None = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserOut(BaseModel):
    id: UUID
    email: EmailStr
    full_name: str | None = None
    role: str

    model_config = ConfigDict(from_attributes=True)

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class UserUpdatePassword(BaseModel):
    old_password: str
    new_password: str