import random
import uuid

from typing import List

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas, auth
from app.services import challenge_service, habit_scoring

router = APIRouter(prefix="/api/challenges", tags=["challenges"])

# In-memory map of challenge_id -> correct answer, valid only within this
# server's uptime. Fine for a demo/dev deployment; swap for Redis (as the
# PDF's architecture diagram suggests) if you need multi-instance/prod scale.
_ANSWER_CACHE = {}


@router.get("/new", response_model=schemas.ChallengeQuestion)
def new_challenge(
    difficulty: str = Query(default="easy"),
    challenge_type: str = Query(default=None),
    current_user: models.User = Depends(auth.get_current_user),
):
    ctype = challenge_type or random.choice(challenge_service.CHALLENGE_TYPES)
    prompt, answer, _sig = challenge_service.generate_challenge(ctype, difficulty)

    challenge_id = str(uuid.uuid4())
    _ANSWER_CACHE[challenge_id] = answer

    return schemas.ChallengeQuestion(
        challenge_id=challenge_id,
        challenge_type=ctype,
        difficulty=difficulty,
        prompt=prompt,
    )


@router.post("/submit", response_model=schemas.ChallengeResult)
def submit_challenge(
    payload: schemas.ChallengeSubmit,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    correct_answer = _ANSWER_CACHE.pop(payload.challenge_id, None)
    is_correct = (
        correct_answer is not None
        and challenge_service.verify_answer(payload.answer, "", correct_answer)
    )

    attempt = models.ChallengeAttempt(
        user_id=current_user.id,
        alarm_id=payload.alarm_id,
        challenge_type=payload.challenge_type,
        difficulty=payload.difficulty,
        was_correct=is_correct,
        snoozed=False,
        response_time_seconds=payload.response_time_seconds,
    )
    db.add(attempt)
    db.commit()

    score = habit_scoring.compute_habit_score(db, current_user)

    message = "Correct! Alarm dismissed." if is_correct else "Not quite — try again to dismiss the alarm."
    return schemas.ChallengeResult(correct=is_correct, message=message, new_habit_score=score["total"])


@router.get("/history", response_model=List[schemas.AttemptRecord])
def challenge_history(
    limit: int = Query(default=50, le=200),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    return (
        db.query(models.ChallengeAttempt)
        .filter(models.ChallengeAttempt.user_id == current_user.id)
        .order_by(models.ChallengeAttempt.created_at.desc())
        .limit(limit)
        .all()
    )


@router.post("/snooze")
def snooze_alarm(
    alarm_id: int = Query(default=None),
    challenge_type: str = Query(default="math"),
    difficulty: str = Query(default="easy"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    attempt = models.ChallengeAttempt(
        user_id=current_user.id,
        alarm_id=alarm_id,
        challenge_type=challenge_type,
        difficulty=difficulty,
        was_correct=False,
        snoozed=True,
    )
    db.add(attempt)
    db.commit()
    return {"detail": "snoozed"}
