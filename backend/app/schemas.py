from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field
from app.models import RoleEnum, ProviderEnum


class UserRegister(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8)
    role: RoleEnum = RoleEnum.USER


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: int
    name: str
    email: EmailStr
    role: RoleEnum
    provider: ProviderEnum
    created_at: datetime

    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    # Intentionally excludes `role` - role can never be changed from the frontend.
    name: Optional[str] = Field(default=None, min_length=2, max_length=120)


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class MessageResponse(BaseModel):
    message: str
