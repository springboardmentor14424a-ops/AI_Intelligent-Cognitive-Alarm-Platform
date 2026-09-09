from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
import datetime

from app.database import get_db
from app import models, schemas, auth

router = APIRouter(prefix="/api/checkin", tags=["checkin"])


@router.post("", response_model=schemas.CheckInOut)
def submit_checkin(
    payload: schemas.CheckInCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    checkin = models.CheckIn(
        user_id=current_user.id,
        alertness_rating=max(1, min(10, payload.alertness_rating)),
        notes=payload.notes.strip()[:300],
    )
    db.add(checkin)
    db.commit()
    db.refresh(checkin)
    return checkin


@router.get("/latest", response_model=schemas.CheckInOut)
def latest_checkin(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    checkin = (
        db.query(models.CheckIn)
        .filter(models.CheckIn.user_id == current_user.id)
        .order_by(models.CheckIn.created_at.desc())
        .first()
    )
    if not checkin:
        # Return a harmless default rather than a 404 — the frontend just
        # shows "no check-in yet" copy when rating is 0.
        return schemas.CheckInOut(id=0, alertness_rating=0, notes="", created_at=datetime.datetime.utcnow())
    return checkin
