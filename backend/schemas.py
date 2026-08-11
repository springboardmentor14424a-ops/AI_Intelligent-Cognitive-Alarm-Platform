from datetime import datetime
from typing import Optional, List
import re
from pydantic import BaseModel, EmailStr, Field, field_validator


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
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class RegisterSuccessResponse(BaseModel):
    status: str = "success"
    message: str = "User registered successfully"
    data: UserResponse

class UserLogin(BaseModel):
    email: EmailStr = Field(..., example="john@gmail.com")
    password: str = Field(..., example="Password@123")

class GoogleOAuthRequest(BaseModel):
    token: Optional[str] = Field(None, description="Google OAuth ID Token or Credential String")
    email: Optional[EmailStr] = Field(None, description="Google Account Email")
    name: Optional[str] = Field(None, description="Google Account Full Name")
    role: Optional[str] = Field(default="USER", description="User Role")

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class TokenData(BaseModel):
    email: Optional[str] = None

class AlarmBase(BaseModel):
    title: str = Field(..., max_length=100)
    alarm_time: str = Field(..., description="Trigger time in 24H format (HH:MM)")
    alarm_type: str = Field(default="One-Time", description="Alarm schedule type")
    repeat_days: str = Field(default="", description="Comma-separated repeat days (e.g. 'Mon,Tue')")
    is_active: bool = Field(default=True)
    challenge: str = Field(default="None")
    difficulty_level: str = Field(default="Medium")
    sound: str = Field(default="Radar")
    vibration: str = Field(default="Standard")
    snooze_duration: int = Field(default=5, ge=1, le=60)

    @field_validator("alarm_time")
    @classmethod
    def validate_time_format(cls, v):
        if not re.match(r"^([01]\d|2[0-3]):[0-5]\d$", v):
            raise ValueError("alarm_time must be in 24-hour HH:MM format")
        return v

    @field_validator("alarm_type")
    @classmethod
    def validate_type(cls, v):
        valid_types = {"Daily", "Weekday", "Weekdays", "Weekend", "Weekends", "One-Time", "Custom", "Smart Adaptive"}
        if v not in valid_types:
            raise ValueError(f"alarm_type must be one of {valid_types}")
        return v

    @field_validator("difficulty_level")
    @classmethod
    def validate_difficulty(cls, v):
        valid_difficulties = {"Easy", "Medium", "Hard"}
        if v not in valid_difficulties:
            raise ValueError(f"difficulty_level must be one of {valid_difficulties}")
        return v

class AlarmCreate(AlarmBase):
    pass

class AlarmUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=100)
    alarm_time: Optional[str] = None
    alarm_type: Optional[str] = None
    repeat_days: Optional[str] = None
    is_active: Optional[bool] = None
    challenge: Optional[str] = None
    difficulty_level: Optional[str] = None
    sound: Optional[str] = None
    vibration: Optional[str] = None
    snooze_duration: Optional[int] = Field(None, ge=1, le=60)

    @field_validator("alarm_time")
    @classmethod
    def validate_time_format(cls, v):
        if v is not None and not re.match(r"^([01]\d|2[0-3]):[0-5]\d$", v):
            raise ValueError("alarm_time must be in 24-hour HH:MM format")
        return v

    @field_validator("alarm_type")
    @classmethod
    def validate_type(cls, v):
        if v is not None:
            valid_types = {"Daily", "Weekday", "Weekdays", "Weekend", "Weekends", "One-Time", "Custom", "Smart Adaptive"}
            if v not in valid_types:
                raise ValueError(f"alarm_type must be one of {valid_types}")
        return v

    @field_validator("difficulty_level")
    @classmethod
    def validate_difficulty(cls, v):
        if v is not None:
            valid_difficulties = {"Easy", "Medium", "Hard"}
            if v not in valid_difficulties:
                raise ValueError(f"difficulty_level must be one of {valid_difficulties}")
        return v

class AlarmResponse(AlarmBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class CheckNextRequest(BaseModel):
    base_time: Optional[datetime] = None

class CheckNextResponse(BaseModel):
    next_alarm: Optional[AlarmResponse] = None
    next_trigger: Optional[datetime] = None
    time_remaining_seconds: Optional[float] = None


# Cognitive Challenge Schemas
class ChallengeTypesResponse(BaseModel):
    challenge_types: List[str]
    difficulty_levels: List[str]

class ChallengeResponse(BaseModel):
    id: Optional[str] = None
    type: str
    difficulty: str
    question: str
    options: List[str] = []
    answer: Optional[str] = None
    explanation: str

class ChallengeValidateRequest(BaseModel):
    challenge_id: Optional[str] = None
    user_answer: str
    correct_answer: Optional[str] = None
    challenge_type: Optional[str] = None

class ChallengeValidateResponse(BaseModel):
    correct: bool
    message: str
    explanation: str



