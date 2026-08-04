from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies import require_role
from app import models

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/user")
def user_dashboard(current_user: models.User = Depends(require_role("USER"))):
    return {
        "message": f"Welcome {current_user.name}",
        "role": "USER",
        "widgets": ["alarm_history", "wake_up_statistics", "habit_score", "challenge_performance"],
    }


@router.get("/wellness-coach")
def wellness_coach_dashboard(
    current_user: models.User = Depends(require_role("WELLNESS_COACH")),
    db: Session = Depends(get_db),
):
    total_users = db.query(models.User).filter(models.User.role == models.RoleEnum.USER).count()
    return {
        "message": f"Welcome {current_user.name}",
        "role": "WELLNESS_COACH",
        "total_users_monitored": total_users,
        "widgets": ["user_behavior_insights", "habit_adherence_analytics", "sleep_trend_reports"],
    }


@router.get("/admin")
def admin_dashboard(
    current_user: models.User = Depends(require_role("ADMIN")),
    db: Session = Depends(get_db),
):
    total_users = db.query(models.User).count()
    by_role = {
        role.value: db.query(models.User).filter(models.User.role == role).count()
        for role in models.RoleEnum
    }
    return {
        "message": f"Welcome {current_user.name}",
        "role": "ADMIN",
        "total_users": total_users,
        "users_by_role": by_role,
        "widgets": ["user_management", "platform_analytics", "system_reports"],
    }
