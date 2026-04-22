from pydantic import BaseModel, EmailStr, ConfigDict
from typing import Optional
from uuid import UUID


class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    role: str = "employee"


class UserAdminCreate(UserBase):
    password: str

class UserOut(UserBase):
    id: UUID
    manager_id: Optional[UUID] = None

    model_config = ConfigDict(from_attributes=True)



class UserUpdatePassword(BaseModel):
    old_password: str
    new_password: str

class UserUpdateRole(BaseModel):
    role: str

class UserUpdateManager(BaseModel):
    manager_id: Optional[UUID]