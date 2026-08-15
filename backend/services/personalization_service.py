import logging
from sqlalchemy.orm import Session
from sqlalchemy import desc
from models import ChallengeAttempt

logger = logging.getLogger(__name__)

# 5 Difficulty Levels in order
DIFFICULTY_LEVELS = ["Beginner", "Easy", "Medium", "Difficult", "Advanced"]

# Common standard time limit across all challenge difficulties (in seconds)
COMMON_CHALLENGE_TIME_LIMIT = 30

def get_time_limit_for_difficulty(difficulty: str = None) -> int:
    """Returns the common standard time limit in seconds (30s) for challenges."""
    return COMMON_CHALLENGE_TIME_LIMIT

def step_difficulty(current_diff: str, direction: int) -> str:
    """
    Steps difficulty up (+1) or down (-1) across 5 levels.
    Levels: Beginner <-> Easy <-> Medium <-> Difficult <-> Advanced
    """
    normalized = current_diff.title().strip() if current_diff else "Medium"
    if normalized not in DIFFICULTY_LEVELS:
        normalized = "Medium"
    
    idx = DIFFICULTY_LEVELS.index(normalized)
    new_idx = max(0, min(len(DIFFICULTY_LEVELS) - 1, idx + direction))
    return DIFFICULTY_LEVELS[new_idx]

def calculate_personalized_difficulty(db: Session, user_id: int, base_difficulty: str = "Medium") -> str:
    """
    Calculates dynamic difficulty based on the user's recent challenge attempts (last 5 attempts).
    Factors evaluated:
    1. Recent Accuracy (% of correct attempts)
    2. Response Speed Ratio (avg time_taken / time_limit)
    3. Failed Attempt / Timeout Frequency
    """
    if not user_id:
        return base_difficulty if base_difficulty in DIFFICULTY_LEVELS else "Medium"

    try:
        recent_attempts = (
            db.query(ChallengeAttempt)
            .filter(ChallengeAttempt.user_id == user_id)
            .order_by(desc(ChallengeAttempt.created_at))
            .limit(5)
            .all()
        )

        if not recent_attempts:
            return base_difficulty if base_difficulty in DIFFICULTY_LEVELS else "Medium"

        total = len(recent_attempts)
        correct_count = sum(1 for a in recent_attempts if a.is_correct)
        failed_count = total - correct_count
        accuracy = (correct_count / total) * 100.0

        # Calculate average response speed ratio
        time_ratios = []
        for a in recent_attempts:
            limit = a.time_limit if a.time_limit and a.time_limit > 0 else 20
            ratio = min(1.0, float(a.time_taken) / float(limit))
            time_ratios.append(ratio)
        avg_speed_ratio = sum(time_ratios) / len(time_ratios) if time_ratios else 0.5

        current_level = base_difficulty if (base_difficulty and base_difficulty in DIFFICULTY_LEVELS) else (recent_attempts[0].difficulty if recent_attempts[0].difficulty in DIFFICULTY_LEVELS else "Medium")
        if current_level not in DIFFICULTY_LEVELS:
            current_level = "Medium"

        logger.debug(
            f"Personalization Engine for User ID {user_id}: RecentAttempts={total}, Accuracy={accuracy:.1f}%, "
            f"AvgSpeedRatio={avg_speed_ratio:.2f}, FailedAttempts={failed_count}, CurrentLevel='{current_level}'"
        )

        # Progression Rules across 5 levels:
        # 1. Excellent Performance: Accuracy >= 90% AND fast/normal speed -> Consider increasing difficulty (+1)
        if accuracy >= 90.0 and failed_count <= 1:
            new_level = step_difficulty(current_level, +1)
            logger.debug(f"High accuracy (>=90%) -> Upgraded difficulty: '{current_level}' -> '{new_level}'")
            return new_level

        # 2. Poor Performance: Accuracy < 70% OR repeated failures (>=2 fails) -> Reduce difficulty (-1)
        elif accuracy < 70.0 or failed_count >= 2:
            new_level = step_difficulty(current_level, -1)
            logger.debug(f"Accuracy <70% or repeated failures -> Reduced difficulty: '{current_level}' -> '{new_level}'")
            return new_level

        # 3. Moderate Performance (70% - 89%) -> Maintain current difficulty
        else:
            return current_level
    except Exception as e:
        logger.error(f"Error calculating personalized difficulty for User {user_id}: {e}")
        return base_difficulty if base_difficulty in DIFFICULTY_LEVELS else "Medium"
