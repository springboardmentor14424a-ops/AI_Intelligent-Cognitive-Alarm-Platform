from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field

class UserRegister(BaseModel):
    name: str = Field(..., example="John", description="User Name")
    email: EmailStr = Field(..., example="john@gmail.com", description="Unique Email Address")
    password: str = Field(..., min_length=6, example="Password@123", description="User Password")
    role: str = Field(default="USER", example="USER", description="User Role (USER, Wellness Coach, Administrator)")
    provider: Optional[str] = Field(default="LOCAL", example="LOCAL", description="Authentication provider (LOCAL or GOOGLE)")

class UserResponse(BaseModel):
    id: int
    name: str
    email: EmailStr
    role: str
    provider: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class RegisterSuccessResponse(BaseModel):
    status: str = "success"
    message: str = "User registered successfully"
    data: UserResponse

class UserLogin(BaseModel):
    email: EmailStr = Field(..., example="john@gmail.com")
    password: str = Field(..., example="Password@123")

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class TokenData(BaseModel):
    email: Optional[str] = None
