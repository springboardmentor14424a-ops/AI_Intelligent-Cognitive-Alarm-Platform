import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr


# ---------- Auth ----------
class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: str = "user"  # "user" or "wellness_coach" — admin cannot self-register via signup


class DemoLoginRequest(BaseModel):
    role: str  # "admin" | "wellness_coach" | "user"


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: int
    name: str
    email: EmailStr
    role: str
    preferred_wake_time: str
    difficulty_preference: str
    target_sleep_time: str
    sleep_duration_hours: float
    challenge_type_preference: str
    snooze_duration_minutes: int
    max_snoozes: int
    ringtone: str
    vibration_enabled: bool
    gradual_volume: bool
    theme: str
    phone: str
    avatar_emoji: str
    is_demo: bool

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ---------- Profile ----------
class ProfileUpdate(BaseModel):
    preferred_wake_time: Optional[str] = None
    difficulty_preference: Optional[str] = None
    timezone: Optional[str] = None
    target_sleep_time: Optional[str] = None
    sleep_duration_hours: Optional[float] = None
    challenge_type_preference: Optional[str] = None
    snooze_duration_minutes: Optional[int] = None
    max_snoozes: Optional[int] = None
    ringtone: Optional[str] = None
    vibration_enabled: Optional[bool] = None
    gradual_volume: Optional[bool] = None
    theme: Optional[str] = None
    phone: Optional[str] = None
    avatar_emoji: Optional[str] = None


# ---------- Alarms ----------
class AlarmCreate(BaseModel):
    label: str = "Alarm"
    time: str  # "HH:MM"
    repeat_days: str = ""
    difficulty: str = "easy"
    challenge_type: str = "math"
    ringtone: str = "classic_bell"
    multi_step_count: int = 1
    verification_method: str = "puzzle_completion"
    vibration_enabled: bool = True
    smart_gradient: bool = False


class AlarmOut(BaseModel):
    id: int
    label: str
    time: str
    repeat_days: str
    is_active: bool
    difficulty: str
    challenge_type: str
    ringtone: str
    multi_step_count: int
    verification_method: str
    vibration_enabled: bool
    smart_gradient: bool
    created_at: datetime.datetime

    class Config:
        from_attributes = True


# ---------- Challenges ----------
class ChallengeQuestion(BaseModel):
    challenge_id: str
    challenge_type: str
    difficulty: str
    prompt: str
    # For math/logic: numeric answer expected; frontend just submits a string
    # and backend validates. Options included for multiple-choice types.
    options: Optional[List[str]] = None


class ChallengeSubmit(BaseModel):
    challenge_id: str
    alarm_id: Optional[int] = None
    challenge_type: str
    difficulty: str
    answer: str
    correct_answer: str  # server generated it statelessly and signed it back to the client
    response_time_seconds: float = 0.0


class ChallengeResult(BaseModel):
    correct: bool
    message: str
    new_habit_score: float


# ---------- Dashboard ----------
class HabitScoreBreakdown(BaseModel):
    wake_up_consistency: float
    challenge_completion_success: float
    snooze_reduction: float
    sleep_schedule_adherence: float
    total: float


class DashboardOut(BaseModel):
    total_alarms: int
    active_alarms: int
    total_attempts: int
    correct_attempts: int
    snoozed_attempts: int
    accuracy_rate: float
    day_streak: int
    habit_score: HabitScoreBreakdown
    recent_attempts: List[dict]


# ---------- Analytics ----------
class AnalyticsOut(BaseModel):
    accuracy_trend: List[dict]           # [{index, accuracy_pct}]
    challenge_type_breakdown: List[dict]  # [{type, attempts, accuracy_pct}]
    snooze_by_weekday: List[dict]        # [{day, count}]
    difficulty_progression: List[dict]   # [{index, difficulty, level}]
    sleep_duration_breakdown: List[dict]  # [{label, count}] bucketed from attempt timestamps vs target
    behavioral_snapshot: dict            # snooze/wake/focus/habit sub-stats, all computed from real data
    habit_radar: List[dict]              # [{axis, value}] 6-axis radar, 0-100 each


# ---------- Post-Wake Check-In ----------
class CheckInCreate(BaseModel):
    alertness_rating: int
    notes: str = ""


class CheckInOut(BaseModel):
    id: int
    alertness_rating: int
    notes: str
    created_at: datetime.datetime

    class Config:
        from_attributes = True


# ---------- AI Personalization ----------
class PersonalizationOut(BaseModel):
    snooze_risk_percent: float
    optimal_bedtime: str
    best_challenge_type: str
    best_challenge_accuracy: float
    recommended_difficulty: str
    current_difficulty_index: int  # 0-4, position in Beginner..Expert track
    habit_score: float
    insights: List[str]
    challenge_rankings: List[dict]  # [{type, accuracy_pct, attempts, avg_time}]
    risk_factors: List[str]
    learning_trajectory: str        # "Calibrating" | "Improving" | "Stable" | "Needs Focus"
    speed_gain_percent: float       # negative = getting faster, positive = getting slower
    retention_index: float          # 0-100, consistency of correct answers over time
    cognitive_speed_label: str      # "Hyper-Fast" | "Fast" | "Moderate" | "Slow" | "Not enough data"
    mastery_score: float            # 0-100, blends habit score + raw accuracy


# ---------- Feedback ----------
class FeedbackCreate(BaseModel):
    rating: int
    comment: str = ""


class FeedbackOut(BaseModel):
    id: int
    rating: int
    comment: str
    created_at: datetime.datetime

    class Config:
        from_attributes = True


# ---------- Admin / Wellness Coach RBAC view ----------
class AdminUserOut(BaseModel):
    id: int
    name: str
    email: str
    role: str
    habit_score: float
    total_alarms: int
    total_attempts: int


# ---------- Full report (for /api/reports/history) ----------
class AttemptRecord(BaseModel):
    id: int
    challenge_type: str
    difficulty: str
    was_correct: bool
    snoozed: bool
    response_time_seconds: float
    created_at: datetime.datetime

    class Config:
        from_attributes = True
