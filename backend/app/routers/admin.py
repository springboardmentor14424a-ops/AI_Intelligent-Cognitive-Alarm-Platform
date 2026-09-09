"""
Real role-based access control (PDF module 1: Role-based access control).
Only admin and wellness_coach roles can reach this — enforced server-side
via auth.require_role, not just hidden in the UI.
"""
from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas, auth
from app.services import habit_scoring

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/users", response_model=List[schemas.AdminUserOut])
def list_all_users(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_role("admin", "wellness_coach")),
):
    users = db.query(models.User).order_by(models.User.created_at.desc()).all()
    result = []
    for u in users:
        score = habit_scoring.compute_habit_score(db, u)
        alarms_count = db.query(models.Alarm).filter(models.Alarm.owner_id == u.id).count()
        attempts_count = db.query(models.ChallengeAttempt).filter(models.ChallengeAttempt.user_id == u.id).count()
        result.append(schemas.AdminUserOut(
            id=u.id, name=u.name, email=u.email, role=u.role,
            habit_score=score["total"], total_alarms=alarms_count, total_attempts=attempts_count,
        ))
    return result
