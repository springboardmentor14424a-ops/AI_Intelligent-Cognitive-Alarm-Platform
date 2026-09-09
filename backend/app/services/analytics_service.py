"""
Behavioral Analytics Engine (PDF module 7) — all numbers here are computed
from the user's actual stored ChallengeAttempt / Alarm rows. Nothing here is
placeholder/fake data; if a user has no attempts yet, these simply return
empty series and the frontend shows an honest "not enough data yet" state.
"""
import datetime
from collections import defaultdict
from typing import List

from sqlalchemy.orm import Session

from app import models
from app.services import habit_scoring

DIFFICULTY_LEVELS = {
    "beginner": 1, "easy": 2, "medium": 3, "hard": 4, "expert": 5,
}

WEEKDAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]


def build_analytics(db: Session, user: models.User) -> dict:
    attempts: List[models.ChallengeAttempt] = (
        db.query(models.ChallengeAttempt)
        .filter(models.ChallengeAttempt.user_id == user.id)
        .order_by(models.ChallengeAttempt.created_at.asc())
        .all()
    )

    # --- Accuracy trend: running accuracy % after each attempt ---
    accuracy_trend = []
    correct_so_far = 0
    for i, a in enumerate(attempts, start=1):
        if a.was_correct:
            correct_so_far += 1
        accuracy_trend.append({
            "index": i,
            "accuracy_pct": round(100.0 * correct_so_far / i, 1),
        })

    # --- Per challenge-type breakdown ---
    type_stats = defaultdict(lambda: {"attempts": 0, "correct": 0})
    for a in attempts:
        type_stats[a.challenge_type]["attempts"] += 1
        if a.was_correct:
            type_stats[a.challenge_type]["correct"] += 1
    challenge_type_breakdown = [
        {
            "type": t,
            "attempts": s["attempts"],
            "accuracy_pct": round(100.0 * s["correct"] / s["attempts"], 1) if s["attempts"] else 0.0,
        }
        for t, s in type_stats.items()
    ]

    # --- Snoozes by weekday ---
    weekday_counts = {day: 0 for day in WEEKDAY_NAMES}
    for a in attempts:
        if a.snoozed:
            weekday_counts[WEEKDAY_NAMES[a.created_at.weekday()]] += 1
    snooze_by_weekday = [{"day": d, "count": weekday_counts[d]} for d in WEEKDAY_NAMES]

    # --- Difficulty progression over time ---
    difficulty_progression = [
        {
            "index": i,
            "difficulty": a.difficulty,
            "level": DIFFICULTY_LEVELS.get(a.difficulty, 2),
        }
        for i, a in enumerate(attempts, start=1)
    ]

    # --- Sleep duration breakdown (bucketed vs. the user's own target) ---
    target = user.sleep_duration_hours or 8.0
    buckets = {"Short (<6h)": 0, "Moderate (6-7h)": 0, "Optimal (7-8.5h)": 0, "Extended (>8.5h)": 0}
    # We don't track real sleep sensor data yet, so this reflects the single
    # target the user has set in Profile — shown as one bucket honestly,
    # not spread across fake categories.
    if target < 6:
        buckets["Short (<6h)"] = 1
    elif target < 7:
        buckets["Moderate (6-7h)"] = 1
    elif target <= 8.5:
        buckets["Optimal (7-8.5h)"] = 1
    else:
        buckets["Extended (>8.5h)"] = 1
    sleep_duration_breakdown = [{"label": k, "count": v} for k, v in buckets.items()]

    behavioral_snapshot = _build_behavioral_snapshot(attempts, user)
    habit_radar = _build_habit_radar(db, user, attempts)

    return {
        "accuracy_trend": accuracy_trend,
        "challenge_type_breakdown": challenge_type_breakdown,
        "snooze_by_weekday": snooze_by_weekday,
        "difficulty_progression": difficulty_progression,
        "sleep_duration_breakdown": sleep_duration_breakdown,
        "behavioral_snapshot": behavioral_snapshot,
        "habit_radar": habit_radar,
    }


def _build_behavioral_snapshot(attempts: List[models.ChallengeAttempt], user: models.User) -> dict:
    """Original panel — same spirit as a 'behavioral analytics' section, but
    every number here is computed from this user's real rows, and labeled
    for exactly what it is (a proxy/index), not dressed up as more than it is."""
    if not attempts:
        return {
            "snooze": {"avg_per_active_day": 0.0, "zero_snooze_rate_pct": 0.0, "peak_snooze_day": "No data yet"},
            "wake_behavior": {"on_time_rate_pct": 0.0, "avg_reaction_seconds": 0.0},
            "focus_index": 0.0,
            "habit_consistency": {"current_streak_days": 0, "weekly_compliance_pct": 0.0},
            "sleep_pattern": {"target_hours": user.sleep_duration_hours or 8.0, "target_bedtime": user.target_sleep_time or "22:30"},
        }

    active_days = {a.created_at.date() for a in attempts}
    snoozed = [a for a in attempts if a.snoozed]
    solved = [a for a in attempts if not a.snoozed]

    avg_per_active_day = round(len(snoozed) / len(active_days), 2) if active_days else 0.0
    zero_snooze_days = sum(
        1 for d in active_days if not any(a.snoozed and a.created_at.date() == d for a in attempts)
    )
    zero_snooze_rate_pct = round(100.0 * zero_snooze_days / len(active_days), 1) if active_days else 0.0

    weekday_snooze_counts = defaultdict(int)
    for a in snoozed:
        weekday_snooze_counts[WEEKDAY_NAMES[a.created_at.weekday()]] += 1
    peak_snooze_day = max(weekday_snooze_counts, key=weekday_snooze_counts.get) if weekday_snooze_counts else "No snoozes yet"

    on_time_rate_pct = round(100.0 * len(solved) / len(attempts), 1) if attempts else 0.0
    reaction_times = [a.response_time_seconds for a in solved if a.response_time_seconds]
    avg_reaction_seconds = round(sum(reaction_times) / len(reaction_times), 1) if reaction_times else 0.0

    correct = sum(1 for a in solved if a.was_correct)
    accuracy_pct = (100.0 * correct / len(solved)) if solved else 0.0
    speed_component = max(0.0, 100.0 - min(100.0, (avg_reaction_seconds / 60.0) * 100.0))
    focus_index = round((accuracy_pct * 0.65) + (speed_component * 0.35), 1)

    today = datetime.datetime.utcnow().date()
    streak = 0
    cursor = today
    qualifying_days = {a.created_at.date() for a in attempts if a.was_correct and not a.snoozed}
    while cursor in qualifying_days:
        streak += 1
        cursor -= datetime.timedelta(days=1)

    last_7_days = {today - datetime.timedelta(days=i) for i in range(7)}
    days_active_last_7 = len(active_days & last_7_days)
    weekly_compliance_pct = round(100.0 * days_active_last_7 / 7.0, 1)

    return {
        "snooze": {
            "avg_per_active_day": avg_per_active_day,
            "zero_snooze_rate_pct": zero_snooze_rate_pct,
            "peak_snooze_day": peak_snooze_day,
        },
        "wake_behavior": {
            "on_time_rate_pct": on_time_rate_pct,
            "avg_reaction_seconds": avg_reaction_seconds,
        },
        "focus_index": focus_index,
        "habit_consistency": {
            "current_streak_days": streak,
            "weekly_compliance_pct": weekly_compliance_pct,
        },
        "sleep_pattern": {
            "target_hours": user.sleep_duration_hours or 8.0,
            "target_bedtime": user.target_sleep_time or "22:30",
        },
    }


def _build_habit_radar(db: Session, user: models.User, attempts: List[models.ChallengeAttempt]) -> list:
    """6-axis radar (0-100 each), reusing the same weighted habit score
    components plus two original axes (reaction speed, streak momentum)."""
    score = habit_scoring.compute_habit_score(db, user)

    solved = [a for a in attempts if not a.snoozed]
    reaction_times = [a.response_time_seconds for a in solved if a.response_time_seconds]
    avg_reaction = (sum(reaction_times) / len(reaction_times)) if reaction_times else 0.0
    reaction_speed = round(max(0.0, 100.0 - min(100.0, (avg_reaction / 60.0) * 100.0)), 1)

    today = datetime.datetime.utcnow().date()
    qualifying_days = {a.created_at.date() for a in attempts if a.was_correct and not a.snoozed}
    streak = 0
    cursor = today
    while cursor in qualifying_days:
        streak += 1
        cursor -= datetime.timedelta(days=1)
    streak_momentum = round(min(100.0, streak * 20.0), 1)

    return [
        {"axis": "Wake Consistency", "value": score["wake_up_consistency"]},
        {"axis": "Challenge Accuracy", "value": score["challenge_completion_success"]},
        {"axis": "Snooze Control", "value": score["snooze_reduction"]},
        {"axis": "Bedtime Regularity", "value": score["sleep_schedule_adherence"]},
        {"axis": "Reaction Speed", "value": reaction_speed},
        {"axis": "Streak Momentum", "value": streak_momentum},
    ]
