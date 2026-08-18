from pydantic import BaseModel, Field
from typing import Optional, List, Any, Union

class ChallengeRequest(BaseModel):
    challenge_type: str = Field(default="math", description="math, logic, memory, word, pattern, riddle, quiz, random")
    difficulty: str = Field(default="medium", description="beginner, easy, medium, hard, expert")

class ChallengeResponse(BaseModel):
    challenge_id: str
    type: str
    difficulty: str
    title: str
    instructions: str
    question: Any  # String, List, or Dict depending on challenge type
    options: Optional[List[str]] = None
    input_type: str  # "number", "text", "choice", "sequence"
    hint: Optional[str] = None
    time_limit: int  # in seconds
    answer_key: str  # Encrypted or plain text string representation for verification

class ChallengeVerifyRequest(BaseModel):
    user_id: Optional[int] = None
    alarm_id: Optional[int] = None
    challenge_id: str
    challenge_type: Optional[str] = "math"
    difficulty: Optional[str] = "medium"
    answer_key: str
    user_answer: str
    time_taken_seconds: float = 0.0

class ChallengeVerifyResponse(BaseModel):
    success: bool
    message: str
    correct_answer: str
    score: int

class AchievementItem(BaseModel):
    id: Optional[int] = None
    badge_key: str
    title: str
    description: str
    icon: str
    unlocked: bool
    progress_percent: int = 0
    unlocked_at: Optional[str] = None

class LearningTrendResponse(BaseModel):
    user_id: int
    growth_rate_percent: float
    speed_improvement_percent: float
    category_balance: dict
    strongest_domain: str
    focus_domain: str
    recommendation: str
    weekly_velocity: List[dict]

