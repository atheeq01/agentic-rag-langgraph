from pydantic import BaseModel, EmailStr, ConfigDict
from typing import Optional
from uuid import UUID


class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    role: str = "employee"
    department: Optional[str] = None


class UserAdminCreate(UserBase):
    password: str
    manager_id: Optional[UUID] = None
    department: Optional[str] = None

class UserOut(UserBase):
    id: UUID
    manager_id: Optional[UUID] = None
    annual_leave_balance: int
    sick_leave_balance: int
    is_active: bool
    model_config = ConfigDict(from_attributes=True)

    model_config = ConfigDict(from_attributes=True)

class UserUpdatePassword(BaseModel):
    old_password: str
    new_password: str

class UserUpdateRole(BaseModel):
    role: str

class UserUpdateManager(BaseModel):
    manager_id: Optional[UUID] = None
    department: Optional[str] = None