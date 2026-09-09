"""
AI Personalization & Engagement Optimization (PDF module 9 + AI Personalization
page). This is an honest, explainable rule-based engine — not a trained ML
model — but every number it returns is computed from the user's real stored
data (their attempts, alarms, and profile settings). Nothing is fabricated
for show.
"""
import datetime
from collections import defaultdict
from typing import List

from sqlalchemy.orm import Session

from app import models
from app.services import habit_scoring

DIFFICULTY_ORDER = ["beginner", "easy", "medium", "hard", "expert"]


def _shift_time(hhmm: str, minus_hours: float) -> str:
    """Subtract minus_hours (float, can be fractional) from an 'HH:MM' string."""
    try:
        h, m = map(int, hhmm.split(":"))
    except Exception:
        h, m = 7, 0
    total_minutes = h * 60 + m - int(round(minus_hours * 60))
    total_minutes %= 24 * 60
    return f"{total_minutes // 60:02d}:{total_minutes % 60:02d}"


def build_personalization(db: Session, user: models.User) -> dict:
    attempts: List[models.ChallengeAttempt] = (
        db.query(models.ChallengeAttempt)
        .filter(models.ChallengeAttempt.user_id == user.id)
        .order_by(models.ChallengeAttempt.created_at.desc())
        .limit(50)
        .all()
    )

    total = len(attempts)
    snoozed = sum(1 for a in attempts if a.snoozed)
    snooze_risk_percent = round(100.0 * snoozed / total, 1) if total else 0.0

    # Best challenge type by accuracy (min 1 attempt to be ranked)
    type_stats = defaultdict(lambda: {"attempts": 0, "correct": 0, "time_total": 0.0})
    for a in attempts:
        s = type_stats[a.challenge_type]
        s["attempts"] += 1
        s["time_total"] += a.response_time_seconds or 0.0
        if a.was_correct:
            s["correct"] += 1

    rankings = []
    for t, s in type_stats.items():
        acc = round(100.0 * s["correct"] / s["attempts"], 1) if s["attempts"] else 0.0
        avg_time = round(s["time_total"] / s["attempts"], 1) if s["attempts"] else 0.0
        rankings.append({"type": t, "accuracy_pct": acc, "attempts": s["attempts"], "avg_time": avg_time})
    rankings.sort(key=lambda r: (-r["accuracy_pct"], r["avg_time"]))

    if rankings:
        best_challenge_type = rankings[0]["type"]
        best_challenge_accuracy = rankings[0]["accuracy_pct"]
    else:
        best_challenge_type = user.challenge_type_preference or "math"
        best_challenge_accuracy = 0.0

    # Recommended difficulty: bump up/down from current preference based on
    # recent accuracy — a simple, explainable version of the "Adaptive
    # Difficulty Engine" module.
    current_idx = DIFFICULTY_ORDER.index(user.difficulty_preference) if user.difficulty_preference in DIFFICULTY_ORDER else 1
    recent_correct = sum(1 for a in attempts[:10] if a.was_correct)
    recent_total = min(10, total)
    recent_accuracy = (100.0 * recent_correct / recent_total) if recent_total else 0.0

    if recent_total >= 3 and recent_accuracy >= 80 and current_idx < len(DIFFICULTY_ORDER) - 1:
        recommended_difficulty = DIFFICULTY_ORDER[current_idx + 1]
    elif recent_total >= 3 and recent_accuracy < 40 and current_idx > 0:
        recommended_difficulty = DIFFICULTY_ORDER[current_idx - 1]
    else:
        recommended_difficulty = user.difficulty_preference or "easy"

    optimal_bedtime = _shift_time(user.preferred_wake_time or "07:00", user.sleep_duration_hours or 8.0)

    score = habit_scoring.compute_habit_score(db, user)
    trajectory, speed_gain_percent, retention_index = _compute_learning_pattern(attempts)
    cognitive_speed_label, mastery_score = _compute_speed_and_mastery(attempts, score["total"])

    insights = []
    if rankings:
        insights.append(
            f"Your strongest challenge type is {best_challenge_type} at {best_challenge_accuracy}% accuracy."
        )
    else:
        insights.append("Complete a few wake-up challenges and this will start tracking your strengths.")

    insights.append(
        f"To get {user.sleep_duration_hours or 8.0} hours of sleep for a {user.preferred_wake_time or '07:00'} "
        f"wake-up, aim to be in bed by {optimal_bedtime}."
    )

    if snooze_risk_percent >= 50:
        insights.append(f"Snooze risk is high ({snooze_risk_percent}%) — consider a harder wake-up challenge.")
    elif total > 0:
        insights.append(f"Snooze risk is currently {snooze_risk_percent}% — keep it up.")

    risk_factors = []
    if total == 0:
        risk_factors.append("No wake-up attempts recorded yet — insights will sharpen as you use alarms.")
    else:
        if snooze_risk_percent >= 50:
            risk_factors.append(f"High snooze rate detected ({snooze_risk_percent}% of recent attempts).")
        fail_rate = 100.0 - (100.0 * sum(1 for a in attempts if a.was_correct) / total)
        if fail_rate >= 50:
            risk_factors.append(f"High challenge failure rate ({round(fail_rate,1)}%) in recent sessions.")
        if not risk_factors:
            risk_factors.append("No significant risk factors detected in your recent activity.")

    return {
        "snooze_risk_percent": snooze_risk_percent,
        "optimal_bedtime": optimal_bedtime,
        "best_challenge_type": best_challenge_type,
        "best_challenge_accuracy": best_challenge_accuracy,
        "recommended_difficulty": recommended_difficulty,
        "current_difficulty_index": current_idx,
        "habit_score": score["total"],
        "insights": insights,
        "challenge_rankings": rankings,
        "risk_factors": risk_factors,
        "learning_trajectory": trajectory,
        "speed_gain_percent": speed_gain_percent,
        "retention_index": retention_index,
        "cognitive_speed_label": cognitive_speed_label,
        "mastery_score": mastery_score,
    }


def _compute_learning_pattern(attempts: List[models.ChallengeAttempt]):
    """
    Honest, simple 'Learning Pattern Analysis': splits attempts into an
    older half and a newer half (chronologically) and compares accuracy and
    response time between them. Needs at least 4 attempts to say anything
    more specific than 'Calibrating'.
    """
    solved = [a for a in attempts if not a.snoozed]
    if len(solved) < 4:
        return "Calibrating", 0.0, round(50.0 if solved else 0.0, 1)

    chronological = list(reversed(solved))  # oldest first
    midpoint = len(chronological) // 2
    older, newer = chronological[:midpoint], chronological[midpoint:]

    def _accuracy(group):
        return (100.0 * sum(1 for a in group if a.was_correct) / len(group)) if group else 0.0

    def _avg_time(group):
        times = [a.response_time_seconds for a in group if a.response_time_seconds]
        return (sum(times) / len(times)) if times else 0.0

    older_acc, newer_acc = _accuracy(older), _accuracy(newer)
    older_time, newer_time = _avg_time(older), _avg_time(newer)

    if newer_acc - older_acc >= 10:
        trajectory = "Improving"
    elif older_acc - newer_acc >= 10:
        trajectory = "Needs Focus"
    else:
        trajectory = "Stable"

    speed_gain_percent = (
        round(100.0 * (newer_time - older_time) / older_time, 1) if older_time > 0 else 0.0
    )

    # Retention index: how consistent (low variance) correctness is across
    # the whole history — a simple stand-in for "does performance hold up
    # over time" rather than a real memory-retention measurement.
    correct_flags = [1 if a.was_correct else 0 for a in solved]
    mean = sum(correct_flags) / len(correct_flags)
    variance = sum((x - mean) ** 2 for x in correct_flags) / len(correct_flags)
    consistency = max(0.0, 1.0 - variance) * 100.0
    retention_index = round((mean * 100.0 * 0.6) + (consistency * 0.4), 1)

    return trajectory, speed_gain_percent, retention_index


def _compute_speed_and_mastery(attempts: List[models.ChallengeAttempt], habit_total: float):
    """
    Cognitive Speed: a plain-language label for the user's average response
    time on solved challenges. Mastery Score: a single 0-100 number blending
    habit score with accuracy, so it summarizes both consistency and skill.
    """
    solved = [a for a in attempts if not a.snoozed]
    times = [a.response_time_seconds for a in solved if a.response_time_seconds]
    avg_time = (sum(times) / len(times)) if times else None

    if avg_time is None:
        cognitive_speed_label = "Not enough data"
    elif avg_time < 8:
        cognitive_speed_label = "Hyper-Fast"
    elif avg_time < 20:
        cognitive_speed_label = "Fast"
    elif avg_time < 40:
        cognitive_speed_label = "Moderate"
    else:
        cognitive_speed_label = "Slow"

    correct = sum(1 for a in solved if a.was_correct)
    accuracy_pct = (100.0 * correct / len(solved)) if solved else 0.0
    mastery_score = round((habit_total * 0.5) + (accuracy_pct * 0.5), 1)

    return cognitive_speed_label, mastery_score
