from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas, auth

router = APIRouter(prefix="/api/alarms", tags=["alarms"])


@router.get("", response_model=List[schemas.AlarmOut])
def list_alarms(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    return (
        db.query(models.Alarm)
        .filter(models.Alarm.owner_id == current_user.id)
        .order_by(models.Alarm.time)
        .all()
    )


@router.post("", response_model=schemas.AlarmOut)
def create_alarm(
    payload: schemas.AlarmCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    alarm = models.Alarm(
        owner_id=current_user.id,
        label=payload.label,
        time=payload.time,
        repeat_days=payload.repeat_days,
        difficulty=payload.difficulty,
        challenge_type=payload.challenge_type,
        ringtone=payload.ringtone,
        multi_step_count=max(1, min(5, payload.multi_step_count)),
        verification_method=payload.verification_method,
        vibration_enabled=payload.vibration_enabled,
        smart_gradient=payload.smart_gradient,
    )
    db.add(alarm)
    db.commit()
    db.refresh(alarm)
    return alarm


@router.patch("/{alarm_id}/toggle", response_model=schemas.AlarmOut)
def toggle_alarm(
    alarm_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    alarm = _get_owned_alarm(db, alarm_id, current_user)
    alarm.is_active = not alarm.is_active
    db.commit()
    db.refresh(alarm)
    return alarm


@router.delete("/{alarm_id}")
def delete_alarm(
    alarm_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    alarm = _get_owned_alarm(db, alarm_id, current_user)
    db.delete(alarm)
    db.commit()
    return {"detail": "deleted"}


def _get_owned_alarm(db: Session, alarm_id: int, user: models.User) -> models.Alarm:
    alarm = db.query(models.Alarm).filter(models.Alarm.id == alarm_id).first()
    if not alarm or alarm.owner_id != user.id:
        raise HTTPException(status_code=404, detail="Alarm not found")
    return alarm
