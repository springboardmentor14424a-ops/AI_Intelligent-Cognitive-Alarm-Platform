"""
Habit Scoring Engine (PDF section 4, module 8).
Implements the exact weighted model from the spec:
  Wake-Up Consistency        35%
  Challenge Completion Success 25%
  Snooze Reduction           20%
  Sleep Schedule Adherence   20%

This is a straightforward, explainable heuristic (not a trained ML model) —
a legitimate MVP way to satisfy the module while leaving room to swap in a
real model later (e.g. via scikit-learn) without changing the API contract.
"""
from typing import List
from sqlalchemy.orm import Session

from app import models


def compute_habit_score(db: Session, user: models.User) -> dict:
    attempts: List[models.ChallengeAttempt] = (
        db.query(models.ChallengeAttempt)
        .filter(models.ChallengeAttempt.user_id == user.id)
        .order_by(models.ChallengeAttempt.created_at.desc())
        .limit(50)
        .all()
    )
    alarms = db.query(models.Alarm).filter(models.Alarm.owner_id == user.id).all()

    total_attempts = len(attempts)
    correct_attempts = sum(1 for a in attempts if a.was_correct)
    snoozed_attempts = sum(1 for a in attempts if a.snoozed)

    # Wake-up consistency: fraction of recent attempts that were NOT snoozed
    wake_up_consistency = (
        100.0 * (total_attempts - snoozed_attempts) / total_attempts
        if total_attempts else 0.0
    )

    # Challenge completion success: correctness rate
    challenge_completion_success = (
        100.0 * correct_attempts / total_attempts if total_attempts else 0.0
    )

    # Snooze reduction: inverse of snooze rate
    snooze_reduction = (
        100.0 * (1 - (snoozed_attempts / total_attempts)) if total_attempts else 0.0
    )

    # Sleep schedule adherence: proxy — fraction of alarms currently active/enabled
    # (a stand-in until real sleep-tracker integration is wired up)
    sleep_schedule_adherence = (
        100.0 * sum(1 for a in alarms if a.is_active) / len(alarms) if alarms else 0.0
    )

    total = (
        wake_up_consistency * 0.35
        + challenge_completion_success * 0.25
        + snooze_reduction * 0.20
        + sleep_schedule_adherence * 0.20
    )

    return {
        "wake_up_consistency": round(wake_up_consistency, 1),
        "challenge_completion_success": round(challenge_completion_success, 1),
        "snooze_reduction": round(snooze_reduction, 1),
        "sleep_schedule_adherence": round(sleep_schedule_adherence, 1),
        "total": round(total, 1),
    }
