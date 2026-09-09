from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas, auth
from app.services import habit_scoring

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("", response_model=schemas.DashboardOut)
def get_dashboard(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    alarms = db.query(models.Alarm).filter(models.Alarm.owner_id == current_user.id).all()
    attempts = (
        db.query(models.ChallengeAttempt)
        .filter(models.ChallengeAttempt.user_id == current_user.id)
        .order_by(models.ChallengeAttempt.created_at.desc())
        .all()
    )

    total_attempts = len(attempts)
    correct_attempts = sum(1 for a in attempts if a.was_correct)
    snoozed_attempts = sum(1 for a in attempts if a.snoozed)
    accuracy_rate = round(100.0 * correct_attempts / total_attempts, 1) if total_attempts else 0.0

    score = habit_scoring.compute_habit_score(db, current_user)
    day_streak = _compute_day_streak(attempts)

    recent = [
        {
            "type": a.challenge_type,
            "difficulty": a.difficulty,
            "correct": a.was_correct,
            "snoozed": a.snoozed,
            "when": a.created_at.isoformat(),
        }
        for a in attempts[:10]
    ]

    return schemas.DashboardOut(
        total_alarms=len(alarms),
        active_alarms=sum(1 for a in alarms if a.is_active),
        total_attempts=total_attempts,
        correct_attempts=correct_attempts,
        snoozed_attempts=snoozed_attempts,
        accuracy_rate=accuracy_rate,
        day_streak=day_streak,
        habit_score=schemas.HabitScoreBreakdown(**score),
        recent_attempts=recent,
    )


def _compute_day_streak(attempts) -> int:
    """
    Real, honest streak: counts consecutive calendar days (walking backward
    from today) that have at least one successfully-solved (non-snoozed,
    correct) attempt. Returns 0 if today has no qualifying attempt yet.
    """
    if not attempts:
        return 0
    qualifying_days = {
        a.created_at.date() for a in attempts if a.was_correct and not a.snoozed
    }
    if not qualifying_days:
        return 0
    import datetime as _dt
    today = _dt.datetime.utcnow().date()
    streak = 0
    cursor = today
    while cursor in qualifying_days:
        streak += 1
        cursor -= _dt.timedelta(days=1)
    return streak
