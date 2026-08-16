from typing import Optional
from uuid import UUID
from pydantic import BaseModel, EmailStr
from app.models.models import RoleEnum

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = None
    role: RoleEnum = RoleEnum.CITIZEN

class UserLogin(BaseModel):
    email: str
    password: str

class UserOut(BaseModel):
    id: UUID
    email: EmailStr
    full_name: Optional[str] = None
    role: RoleEnum
    is_active: bool

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    role: RoleEnum
    user_id: UUID
    user: Optional[UserOut] = None
