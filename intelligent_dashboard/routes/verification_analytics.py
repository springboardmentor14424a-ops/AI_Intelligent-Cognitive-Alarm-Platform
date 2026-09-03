"""
Unified API Router for:
1. Wake-Up Verification Module (Puzzle, Multi-Step, Consecutive, Timed, Accuracy, Anti-Snooze, Wake Confirmation)
2. Behavioral Analytics Engine
3. Habit Scoring Engine (35% Wake-Up, 25% Challenge, 20% Snooze, 20% Sleep)
4. AI Recommendation Engine
5. Notification & Reminder System + Announcements
6. Reports & Export System (PDF & Excel)
"""

import io
import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Form, status, Request
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from database import get_db, User, UserProfile, Alarm, ActivityLog, Announcement, Notification, HabitScoreLog
import auth
from verification_engine import WakeUpVerificationEngine, VerificationMethod
from behavioral_engine import BehavioralAnalyticsEngine
from habit_engine import HabitScoringEngine
from recommendation_engine import RecommendationEngine
from notification_service import (
    send_bedtime_reminder,
    send_habit_reminder,
    send_progress_notification,
    send_challenge_reminder,
    send_habit_alert,
    broadcast_platform_announcement,
    send_upcoming_reminder
)
from report_generator import ReportGenerator

router = APIRouter()


# =============================================================================
# 1. WAKE-UP VERIFICATION MODULE ENDPOINTS
# =============================================================================

class VerificationGenerateSchema(BaseModel):
    method: Optional[str] = None
    verification_method: Optional[str] = None
    difficulty: str = "Medium"
    step_index: int = 1
    total_steps: int = 1
    consecutive_streak: int = 0
    consecutive_target: int = 3
    time_limit_sec: int = 30
    preferred_type: Optional[str] = None


@router.get("/verification/generate", response_class=JSONResponse)
def generate_verification_task_get(
    method: str = VerificationMethod.PUZZLE,
    difficulty: str = "Medium",
    step_index: int = 1,
    total_steps: int = 1,
    consecutive_streak: int = 0,
    consecutive_target: int = 3,
    time_limit_sec: int = 30,
    preferred_type: Optional[str] = None,
    current_user: User = Depends(auth.get_current_user)
):
    """Generates verification challenge based on selected method."""
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    challenge = WakeUpVerificationEngine.generate_verification_challenge(
        verification_method=method,
        difficulty=difficulty,
        step_index=step_index,
        total_steps=total_steps,
        consecutive_streak=consecutive_streak,
        consecutive_target=consecutive_target,
        time_limit_sec=time_limit_sec,
        preferred_type=preferred_type
    )
    return {"challenge": challenge, "verification_method": method}


@router.post("/verification/generate", response_class=JSONResponse)
def generate_verification_task_post(
    data: VerificationGenerateSchema,
    current_user: User = Depends(auth.get_current_user)
):
    """Generates verification challenge based on selected method (POST)."""
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    m = data.verification_method or data.method or VerificationMethod.PUZZLE
    challenge = WakeUpVerificationEngine.generate_verification_challenge(
        verification_method=m,
        difficulty=data.difficulty,
        step_index=data.step_index,
        total_steps=data.total_steps,
        consecutive_streak=data.consecutive_streak,
        consecutive_target=data.consecutive_target,
        time_limit_sec=data.time_limit_sec,
        preferred_type=data.preferred_type
    )
    return {"challenge": challenge, "verification_method": m}


class VerificationSubmitSchema(BaseModel):
    alarm_id: Optional[int] = None
    expected_answer: str
    user_answer: str
    time_taken: float = 0.0
    failed_attempts: int = 0
    verification_method: str = VerificationMethod.PUZZLE
    challenge_type: str = "Math Problems"
    difficulty: str = "Medium"
    step_index: int = 1
    total_steps: int = 1
    consecutive_streak: int = 0
    consecutive_target: int = 3
    time_limit_exceeded: bool = False
    self_wakefulness_rating: Optional[float] = None


@router.post("/verification/validate-dismiss", response_class=JSONResponse)
def validate_dismiss_alarm(
    data: VerificationSubmitSchema,
    db: Session = Depends(get_db),
    current_user: User = Depends(auth.get_current_user)
):
    """
    Validates challenge completion for all verification methods, manages
    anti-snooze rules, updates user habit scores, and determines if alarm can be dismissed.
    """
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    result = WakeUpVerificationEngine.validate_and_dismiss_alarm(
        user_id=current_user.id,
        alarm_id=data.alarm_id,
        expected_answer=data.expected_answer,
        user_answer=data.user_answer,
        time_taken=data.time_taken,
        failed_attempts=data.failed_attempts,
        db=db,
        verification_method=data.verification_method,
        challenge_type=data.challenge_type,
        difficulty=data.difficulty,
        step_index=data.step_index,
        total_steps=data.total_steps,
        consecutive_streak=data.consecutive_streak,
        consecutive_target=data.consecutive_target,
        time_limit_exceeded=data.time_limit_exceeded,
        self_wakefulness_rating=data.self_wakefulness_rating
    )
    return result


class SnoozeRequestSchema(BaseModel):
    alarm_id: Optional[int] = None
    snooze_count: int = 1
    questions_solved: bool = True


@router.post("/verification/snooze", response_class=JSONResponse)
def request_snooze(
    data: SnoozeRequestSchema,
    db: Session = Depends(get_db),
    current_user: User = Depends(auth.get_current_user)
):
    """Anti-Snooze Workflow: verifies snooze restriction, limits & applies escalating difficulty penalties."""
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    result = WakeUpVerificationEngine.process_snooze_request(
        user_id=current_user.id,
        alarm_id=data.alarm_id,
        db=db,
        questions_solved=data.questions_solved
    )
    return result


class PostWakeConfirmSchema(BaseModel):
    alarm_id: Optional[int] = None
    confirmed: bool = True
    wakefulness_level: Optional[str] = "Fully awake" # Slightly awake, Half awake, Fully awake
    wakefulness_rating: float = Field(5.0, ge=1.0, le=10.0, description="Wakefulness rating 1-5 or 1-10")
    response_time_sec: float = 0.0
    notes: Optional[str] = None


@router.post("/verification/wake-confirm", response_class=JSONResponse)
def post_wake_confirm(
    data: PostWakeConfirmSchema,
    db: Session = Depends(get_db),
    current_user: User = Depends(auth.get_current_user)
):
    """Unified 'Are you awake?' check-in tracking with 3-level wakefulness prompt."""
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    result = WakeUpVerificationEngine.submit_post_wake_confirmation(
        user_id=current_user.id,
        alarm_id=data.alarm_id,
        wakefulness_rating=data.wakefulness_rating,
        notes=data.notes,
        confirmed=data.confirmed,
        wakefulness_level=data.wakefulness_level,
        response_time_sec=data.response_time_sec,
        db=db
    )
    return result


# =============================================================================
# 2. BEHAVIORAL ANALYTICS ENGINE ENDPOINTS
# =============================================================================

@router.get("/analytics/snooze-patterns", response_class=JSONResponse)
def get_snooze_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(auth.get_current_user)
):
    """Snooze pattern analysis & peak distribution."""
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return BehavioralAnalyticsEngine.analyze_snooze_patterns(current_user.id, db)


@router.get("/analytics/wake-behavior", response_class=JSONResponse)
def get_wake_behavior_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(auth.get_current_user)
):
    """Wake-up behavior tracking & drift analysis."""
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return BehavioralAnalyticsEngine.track_wake_up_behavior(current_user.id, db)


@router.get("/analytics/productivity-correlation", response_class=JSONResponse)
def get_productivity_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(auth.get_current_user)
):
    """Productivity correlation analysis."""
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return BehavioralAnalyticsEngine.analyze_productivity_correlation(current_user.id, db)


@router.get("/analytics/habit-consistency", response_class=JSONResponse)
def get_habit_consistency_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(auth.get_current_user)
):
    """Habit consistency monitoring."""
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return BehavioralAnalyticsEngine.monitor_habit_consistency(current_user.id, db)


@router.get("/analytics/sleep-patterns", response_class=JSONResponse)
def get_sleep_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(auth.get_current_user)
):
    """Sleep pattern analytics & sleep debt calculation."""
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return BehavioralAnalyticsEngine.analyze_sleep_patterns(current_user.id, db)


@router.get("/analytics/full-dossier", response_class=JSONResponse)
@router.get("/analytics/predictive-engine", response_class=JSONResponse)
def get_full_analytics_dossier(
    db: Session = Depends(get_db),
    current_user: User = Depends(auth.get_current_user)
):
    """Full unified behavioral telemetry dossier and predictive engine metrics."""
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return BehavioralAnalyticsEngine.get_full_behavioral_dossier(current_user.id, db)


# =============================================================================
# 3. HABIT SCORING ENGINE ENDPOINTS (35/25/20/20 Weighted Model)
# =============================================================================

@router.get("/habit/score", response_class=JSONResponse)
def get_habit_score_breakdown(
    db: Session = Depends(get_db),
    current_user: User = Depends(auth.get_current_user)
):
    """Calculates and returns the exact weighted habit score breakdown."""
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return HabitScoringEngine.compute_and_persist_habit_score(current_user.id, db)


@router.post("/habit/recalculate", response_class=JSONResponse)
def recalculate_habit_score(
    db: Session = Depends(get_db),
    current_user: User = Depends(auth.get_current_user)
):
    """Triggers recalculation and persistence of habit scores."""
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return HabitScoringEngine.compute_and_persist_habit_score(current_user.id, db)


@router.get("/habit/history", response_class=JSONResponse)
def get_habit_score_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(auth.get_current_user)
):
    """Returns past habit scoring records for trend plotting."""
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    logs = (
        db.query(HabitScoreLog)
        .filter(HabitScoreLog.user_id == current_user.id)
        .order_by(HabitScoreLog.calculated_at.desc())
        .limit(30)
        .all()
    )
    return [
        {
            "id": l.id,
            "habit_score": l.habit_score,
            "wake_up_consistency": l.wake_up_consistency,
            "challenge_completion": l.challenge_completion,
            "snooze_reduction": l.snooze_reduction,
            "sleep_schedule_adherence": l.sleep_schedule_adherence,
            "productivity_score": l.productivity_score,
            "calculated_at": l.calculated_at.isoformat() if l.calculated_at else None
        }
        for l in logs
    ]


# =============================================================================
# 4. RECOMMENDATION ENGINE ENDPOINTS
# =============================================================================

@router.get("/recommendations/sleep", response_class=JSONResponse)
def get_sleep_recs(db: Session = Depends(get_db), current_user: User = Depends(auth.get_current_user)):
    if not current_user: raise HTTPException(status_code=401, detail="Not authenticated")
    return RecommendationEngine.get_sleep_improvement_recommendations(current_user.id, db)


@router.get("/recommendations/wake-up", response_class=JSONResponse)
def get_wake_recs(db: Session = Depends(get_db), current_user: User = Depends(auth.get_current_user)):
    if not current_user: raise HTTPException(status_code=401, detail="Not authenticated")
    return RecommendationEngine.get_wake_up_optimization_suggestions(current_user.id, db)


@router.get("/recommendations/habit", response_class=JSONResponse)
def get_habit_recs(db: Session = Depends(get_db), current_user: User = Depends(auth.get_current_user)):
    if not current_user: raise HTTPException(status_code=401, detail="Not authenticated")
    return RecommendationEngine.get_habit_improvement_guidance(current_user.id, db)


@router.get("/recommendations/productivity", response_class=JSONResponse)
def get_productivity_recs(db: Session = Depends(get_db), current_user: User = Depends(auth.get_current_user)):
    if not current_user: raise HTTPException(status_code=401, detail="Not authenticated")
    return RecommendationEngine.get_productivity_recommendations(current_user.id, db)


@router.get("/recommendations/challenges", response_class=JSONResponse)
def get_challenge_recs(db: Session = Depends(get_db), current_user: User = Depends(auth.get_current_user)):
    if not current_user: raise HTTPException(status_code=401, detail="Not authenticated")
    return RecommendationEngine.get_personalized_challenge_recommendations(current_user.id, db)


@router.get("/recommendations/all", response_class=JSONResponse)
def get_all_recs(db: Session = Depends(get_db), current_user: User = Depends(auth.get_current_user)):
    if not current_user: raise HTTPException(status_code=401, detail="Not authenticated")
    return RecommendationEngine.get_unified_recommendation_dossier(current_user.id, db)


# =============================================================================
# 5. NOTIFICATION & ANNOUNCEMENT SYSTEM ENDPOINTS
# =============================================================================

@router.post("/notifications/reminders/bedtime", response_class=JSONResponse)
def trigger_bedtime_reminder(db: Session = Depends(get_db), current_user: User = Depends(auth.get_current_user)):
    if not current_user: raise HTTPException(status_code=401, detail="Not authenticated")
    profile = current_user.profile
    st = profile.sleep_time if profile and profile.sleep_time else "22:30"
    wt = profile.wake_up_time if profile and profile.wake_up_time else "07:00"
    ok = send_bedtime_reminder(current_user.id, st, wt, current_user.fcm_token)
    return {"success": ok, "message": "Bedtime reminder triggered"}


@router.post("/notifications/reminders/habit", response_class=JSONResponse)
def trigger_habit_reminder(db: Session = Depends(get_db), current_user: User = Depends(auth.get_current_user)):
    if not current_user: raise HTTPException(status_code=401, detail="Not authenticated")
    profile = current_user.profile
    streak = profile.streak if profile else 0
    score = profile.habit_score if profile else 50
    ok = send_habit_reminder(current_user.id, streak, score, current_user.fcm_token)
    return {"success": ok, "message": "Habit reminder triggered"}


@router.post("/notifications/reminders/challenge", response_class=JSONResponse)
def trigger_challenge_reminder(
    challenge_type: str = "Math Problems",
    db: Session = Depends(get_db),
    current_user: User = Depends(auth.get_current_user)
):
    if not current_user: raise HTTPException(status_code=401, detail="Not authenticated")
    ok = send_challenge_reminder(current_user.id, challenge_type, current_user.fcm_token)
    return {"success": ok, "message": f"Challenge reminder for '{challenge_type}' triggered"}


@router.post("/notifications/reminders/progress", response_class=JSONResponse)
def trigger_progress_notification(db: Session = Depends(get_db), current_user: User = Depends(auth.get_current_user)):
    if not current_user: raise HTTPException(status_code=401, detail="Not authenticated")
    profile = current_user.profile
    score = float(profile.habit_score if profile else 50)
    ok = send_progress_notification(current_user.id, score, 85.0, current_user.fcm_token)
    return {"success": ok, "message": "Progress digest notification triggered"}


class AnnouncementBroadcastSchema(BaseModel):
    title: str = Field(..., min_length=3)
    content: str = Field(..., min_length=5)
    target_role: str = Field("all", description="all | user | coach")
    priority: str = Field("normal", description="normal | high | urgent")


@router.post("/admin/announcements/broadcast")
async def admin_broadcast(
    request: Request,
    db: Session = Depends(get_db),
    current_admin: User = Depends(auth.get_current_user)
):
    """Admin endpoint to broadcast announcements across platform (supports JSON & Form)."""
    if not current_admin or current_admin.role != "administrator":
        raise HTTPException(status_code=403, detail="Forbidden: Admin credentials required")

    title = ""
    content = ""
    target_role = "all"
    priority = "normal"

    content_type = request.headers.get("content-type", "")
    if "application/json" in content_type:
        body = await request.json()
        title = body.get("title", "")
        content = body.get("content", "")
        target_role = body.get("target_role", "all")
        priority = body.get("priority", "normal")
    else:
        form = await request.form()
        title = form.get("title", "")
        content = form.get("content", "")
        target_role = form.get("target_role", "all")
        priority = form.get("priority", "normal")

    if not title or not content:
        raise HTTPException(status_code=400, detail="Title and content are required")

    result = broadcast_platform_announcement(
        title=str(title),
        content=str(content),
        target_role=str(target_role),
        priority=str(priority),
        admin_id=current_admin.id
    )
    return JSONResponse(content=result)


@router.get("/announcements", response_class=JSONResponse)
def list_announcements(
    db: Session = Depends(get_db),
    current_user: User = Depends(auth.get_current_user)
):
    """Get active platform announcements for current user role."""
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    query = db.query(Announcement)
    if current_user.role != "administrator":
        query = query.filter((Announcement.target_role == "all") | (Announcement.target_role == current_user.role))
    
    announcements = query.order_by(Announcement.created_at.desc()).limit(20).all()
    return [
        {
            "id": a.id,
            "title": a.title,
            "content": a.content,
            "target_role": a.target_role,
            "priority": a.priority,
            "created_at": a.created_at.isoformat() if a.created_at else None
        }
        for a in announcements
    ]


# =============================================================================
# 6. REPORTS & EXPORT SYSTEM ENDPOINTS (PDF & Excel)
# =============================================================================

@router.get("/reports/export")
def export_report_unified(
    format: str = Query("pdf", pattern="^(pdf|excel|xlsx|csv)$"),
    report_type: str = Query("all", pattern="^(all|habit|wake_up|challenge|productivity|sleep)$"),
    user_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(auth.get_current_user)
):
    """Unified /reports/export endpoint routing to pdf or excel report generator."""
    if format in ("excel", "xlsx", "csv"):
        return export_excel_report(report_type=report_type, user_id=user_id, db=db, current_user=current_user)
    return export_pdf_report(report_type=report_type, user_id=user_id, db=db, current_user=current_user)


@router.get("/reports/export/pdf")
def export_pdf_report(
    report_type: str = Query("all", pattern="^(all|habit|wake_up|challenge|productivity|sleep)$"),
    user_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(auth.get_current_user)
):
    """Download clean formatted PDF Report for Habit, Wake-Up, Challenge, Productivity, or Sleep."""
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    target_id = current_user.id
    if user_id and current_user.role in ("administrator", "coach"):
        target_id = user_id

    pdf_buffer = ReportGenerator.generate_pdf(report_type, target_id, db)
    filename = f"{report_type}_report_{datetime.datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.pdf"

    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/reports/export/excel")
def export_excel_report(
    report_type: str = Query("all", pattern="^(all|habit|wake_up|challenge|productivity|sleep)$"),
    user_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(auth.get_current_user)
):
    """Download clean multi-sheet Excel (.xlsx) Report."""
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    target_id = current_user.id
    if user_id and current_user.role in ("administrator", "coach"):
        target_id = user_id

    excel_buffer = ReportGenerator.generate_excel(report_type, target_id, db)
    filename = f"{report_type}_report_{datetime.datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.xlsx"

    return StreamingResponse(
        excel_buffer,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
