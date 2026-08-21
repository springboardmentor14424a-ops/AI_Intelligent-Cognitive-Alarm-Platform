from datetime import datetime
from typing import Optional, List, Dict, Any
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
    snooze_duration: int = Field(default=5, description="Snooze duration in minutes")

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
        if v is None:
            return v
        normalized = v.title().strip()
        alias_map = {
            "Beginner": "Beginner",
            "Easy": "Easy",
            "Medium": "Medium",
            "Hard": "Hard",
            "Difficult": "Hard",
            "Expert": "Expert",
            "Advanced": "Expert"
        }
        if normalized not in alias_map:
            raise ValueError(f"difficulty_level must be one of {list(alias_map.keys())}")
        return alias_map[normalized]

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
    snooze_duration: Optional[int] = None

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
            normalized = v.title().strip()
            alias_map = {
                "Beginner": "Beginner",
                "Easy": "Easy",
                "Medium": "Medium",
                "Hard": "Hard",
                "Difficult": "Hard",
                "Expert": "Expert",
                "Advanced": "Expert"
            }
            if normalized not in alias_map:
                raise ValueError(f"difficulty_level must be one of {list(alias_map.keys())}")
            return alias_map[normalized]
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
    time_limit: int = 30
    recommended_difficulty: Optional[str] = None
    recommended_challenge_type: Optional[str] = None
    adaptive_reason: Optional[str] = None
    alarm_id: Optional[int] = None

class ChallengeValidateRequest(BaseModel):
    challenge_id: Optional[str] = None
    user_answer: str = ""
    correct_answer: Optional[str] = None
    challenge_type: Optional[str] = None
    difficulty: Optional[str] = None
    question: Optional[str] = None
    alarm_id: Optional[int] = None
    attempt_number: Optional[int] = 1
    time_taken: Optional[float] = 0.0
    time_limit: Optional[int] = 30
    is_timeout: Optional[bool] = False

class ChallengeValidateResponse(BaseModel):
    correct: bool
    message: str
    explanation: str
    attempt_number: int = 1
    next_recommended_difficulty: Optional[str] = None
    next_recommended_type: Optional[str] = None
    adaptive_reason: Optional[str] = None
    next_challenge: Optional[ChallengeResponse] = None

class ChallengeAttemptResponse(BaseModel):
    id: int
    user_id: int
    alarm_id: Optional[int] = None
    challenge_type: str
    difficulty: str
    question: str
    correct_answer: str
    user_answer: str
    is_correct: bool
    attempt_number: int
    time_taken: float
    time_limit: int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class UserPerformanceResponse(BaseModel):
    user_id: int
    total_attempts: int
    total_passed: int
    accuracy_percentage: float
    average_time_taken: float
    recommended_difficulty: str
    preferred_challenge_type: Optional[str] = None
    reason: Optional[str] = None
    score: Optional[float] = None
    trend: Optional[str] = None
    strong_types: List[str] = []
    weak_types: List[str] = []
    type_breakdown: Optional[Dict[str, Any]] = None
    recent_attempts: List[ChallengeAttemptResponse] = []

class AdaptiveRecommendationResponse(BaseModel):
    user_id: int
    recommended_difficulty: str
    recommended_challenge_type: str
    reason: str
    strong_types: List[str] = []
    weak_types: List[str] = []
    score: float
    trend: str
    analysis: Dict[str, Any]
