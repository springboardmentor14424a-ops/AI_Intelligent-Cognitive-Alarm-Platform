import logging
from typing import Dict, List, Optional, Any, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import desc
from models import ChallengeAttempt

logger = logging.getLogger(__name__)

# 5 Canonical Difficulty Levels in order: Beginner -> Easy -> Medium -> Hard -> Expert
DIFFICULTY_LEVELS = ["Beginner", "Easy", "Medium", "Hard", "Expert"]

# Common standard time limit across all challenge difficulties (in seconds)
COMMON_CHALLENGE_TIME_LIMIT = 30

# Supported Challenge Types
ALLOWED_TYPES = [
    "Math Problems",
    "Logic Puzzles",
    "Memory Challenges",
    "Word Games",
    "Pattern Recognition",
    "Riddles",
    "Quick Quizzes"
]

def normalize_difficulty(diff: Optional[str]) -> str:
    """
    Normalizes input difficulty string to one of the 5 canonical levels:
    Beginner, Easy, Medium, Hard, Expert.
    Handles legacy aliases: 'Difficult' -> 'Hard', 'Advanced' -> 'Expert'.
    """
    if not diff:
        return "Medium"
    
    val = str(diff).strip().title()
    alias_map = {
        "Beginner": "Beginner",
        "Easy": "Easy",
        "Medium": "Medium",
        "Hard": "Hard",
        "Difficult": "Hard",
        "Expert": "Expert",
        "Advanced": "Expert"
    }
    return alias_map.get(val, "Medium")

def get_time_limit_for_difficulty(difficulty: Optional[str] = None) -> int:
    """Returns the common standard time limit in seconds (30s) for challenges."""
    return COMMON_CHALLENGE_TIME_LIMIT

def step_difficulty(current_diff: Optional[str], direction: int) -> str:
    """
    Steps difficulty up (+1) or down (-1) across 5 canonical levels:
    Beginner <-> Easy <-> Medium <-> Hard <-> Expert
    Clamps strictly between Beginner and Expert.
    """
    normalized = normalize_difficulty(current_diff)
    idx = DIFFICULTY_LEVELS.index(normalized)
    new_idx = max(0, min(len(DIFFICULTY_LEVELS) - 1, idx + direction))
    return DIFFICULTY_LEVELS[new_idx]

class AdaptiveDifficultyEngine:
    """
    Intelligent Adaptive Difficulty Engine for WakeWise AI.
    Analyzes historical challenge attempts to dynamically compute:
    1. Optimal difficulty level across 5 canonical tiers (Beginner -> Expert).
    2. Preferred / recommended challenge type with engagement anti-repetition.
    3. Strong and weak challenge domains.
    4. Cognitive performance score (0-100) and recent performance trends.
    5. Explainable recommendation rationale.
    """

    @staticmethod
    def analyze_user_performance(attempts: List[ChallengeAttempt]) -> Dict[str, Any]:
        """
        Analyzes a list of user challenge attempts (ordered newest to oldest).
        Computes accuracy, completion speed, failure counts, timeouts, score,
        type-specific breakdowns, trends, and consecutive streaks.
        """
        total = len(attempts)
        if total == 0:
            return {
                "total_attempts": 0,
                "passed_attempts": 0,
                "failed_attempts": 0,
                "overall_accuracy": 0.0,
                "recent_accuracy": 0.0,
                "avg_time_taken": 0.0,
                "recent_avg_time": 0.0,
                "avg_speed_ratio": 0.5,
                "timeouts": 0,
                "consecutive_successes": 0,
                "consecutive_failures": 0,
                "score": 50.0,
                "trend": "stable",
                "strong_types": [],
                "weak_types": [],
                "type_breakdown": {},
                "recent_types_history": []
            }

        passed = sum(1 for a in attempts if a.is_correct)
        failed = total - passed
        overall_accuracy = round((passed / total) * 100.0, 1)

        times = [a.time_taken for a in attempts if a.time_taken is not None and a.time_taken > 0]
        avg_time = round(sum(times) / len(times), 1) if times else 0.0

        # Timeouts: failed attempts where time_taken >= time_limit or was 0
        timeouts = sum(
            1 for a in attempts
            if not a.is_correct and (
                (a.time_limit and a.time_taken >= a.time_limit) or a.time_taken == 0
            )
        )

        # Recent attempts analysis (last 5 attempts)
        recent = attempts[:5]
        recent_count = len(recent)
        recent_passed = sum(1 for a in recent if a.is_correct)
        recent_failed = recent_count - recent_passed
        recent_accuracy = round((recent_passed / recent_count) * 100.0, 1)

        recent_times = [a.time_taken for a in recent if a.time_taken is not None and a.time_taken > 0]
        recent_avg_time = round(sum(recent_times) / len(recent_times), 1) if recent_times else avg_time

        # Response speed ratios (time_taken / time_limit)
        time_ratios = []
        for a in recent:
            limit = a.time_limit if a.time_limit and a.time_limit > 0 else COMMON_CHALLENGE_TIME_LIMIT
            ratio = min(1.0, float(a.time_taken or 0) / float(limit))
            time_ratios.append(ratio)
        avg_speed_ratio = round(sum(time_ratios) / len(time_ratios), 2) if time_ratios else 0.5

        # Consecutive streaks at the top of recent attempts
        consecutive_successes = 0
        consecutive_failures = 0
        for a in attempts:
            if a.is_correct:
                if consecutive_failures == 0:
                    consecutive_successes += 1
                else:
                    break
            else:
                if consecutive_successes == 0:
                    consecutive_failures += 1
                else:
                    break

        # Calculate Cognitive Performance Score (0-100)
        # 1. Base from recent/overall accuracy (up to 65 pts)
        acc_pts = (recent_accuracy * 0.50) + (overall_accuracy * 0.15)
        # 2. Speed bonus (up to 25 pts for fast correct completions)
        speed_bonus = max(0.0, (1.0 - avg_speed_ratio) * 25.0)
        # 3. Streak modifier (+10 for strong streak, -10 for failure streak)
        streak_mod = min(10.0, consecutive_successes * 2.5) - min(10.0, consecutive_failures * 3.5)
        score = round(max(0.0, min(100.0, acc_pts + speed_bonus + streak_mod)), 1)

        # Performance breakdown by challenge type
        type_stats: Dict[str, Dict[str, Any]] = {}
        for t in ALLOWED_TYPES:
            type_stats[t] = {
                "attempts": 0,
                "passed": 0,
                "failed": 0,
                "accuracy": 0.0,
                "avg_time": 0.0,
                "recommended_difficulty": "Medium"
            }

        for a in attempts:
            ctype = a.challenge_type or "Math Problems"
            if ctype not in type_stats:
                type_stats[ctype] = {
                    "attempts": 0,
                    "passed": 0,
                    "failed": 0,
                    "accuracy": 0.0,
                    "avg_time": 0.0,
                    "recommended_difficulty": "Medium"
                }
            type_stats[ctype]["attempts"] += 1
            if a.is_correct:
                type_stats[ctype]["passed"] += 1
            else:
                type_stats[ctype]["failed"] += 1
            type_stats[ctype]["avg_time"] += (a.time_taken or 0)

        strong_types = []
        weak_types = []

        for ctype, stats in type_stats.items():
            att = stats["attempts"]
            if att > 0:
                acc = round((stats["passed"] / att) * 100.0, 1)
                stats["accuracy"] = acc
                stats["avg_time"] = round(stats["avg_time"] / att, 1)
                
                # Determine domain-specific difficulty tier
                if acc >= 90.0 and att >= 2:
                    stats["recommended_difficulty"] = "Hard"
                elif acc >= 75.0:
                    stats["recommended_difficulty"] = "Medium"
                elif acc < 60.0 and att >= 2:
                    stats["recommended_difficulty"] = "Easy"
                else:
                    stats["recommended_difficulty"] = "Medium"

                if acc >= 85.0 and att >= 2:
                    strong_types.append(ctype)
                elif acc < 70.0 and att >= 2:
                    weak_types.append(ctype)

        # Fallback strong/weak if user has fewer attempts per type
        if not strong_types and attempts:
            best_type = max(
                (t for t, s in type_stats.items() if s["attempts"] > 0),
                key=lambda t: type_stats[t]["accuracy"],
                default=None
            )
            if best_type and type_stats[best_type]["accuracy"] >= 80.0:
                strong_types.append(best_type)

        if not weak_types and attempts:
            worst_type = min(
                (t for t, s in type_stats.items() if s["attempts"] > 0),
                key=lambda t: type_stats[t]["accuracy"],
                default=None
            )
            if worst_type and type_stats[worst_type]["accuracy"] < 70.0:
                weak_types.append(worst_type)

        # Recent performance trend evaluation (last 5 vs attempts 6..15)
        trend = "stable"
        if len(attempts) >= 4:
            prev_attempts = attempts[5:15]
            if prev_attempts:
                prev_acc = (sum(1 for a in prev_attempts if a.is_correct) / len(prev_attempts)) * 100.0
                if recent_accuracy >= prev_acc + 15.0 or (recent_accuracy >= 90.0 and consecutive_successes >= 3):
                    trend = "improving"
                elif recent_accuracy <= prev_acc - 15.0 or consecutive_failures >= 2 or recent_accuracy < 60.0:
                    trend = "declining"
                else:
                    trend = "stable"
            else:
                if recent_accuracy >= 90.0 and consecutive_successes >= 2:
                    trend = "improving"
                elif recent_accuracy < 70.0 or consecutive_failures >= 2:
                    trend = "declining"

        recent_types_history = [a.challenge_type for a in recent if a.challenge_type]

        return {
            "total_attempts": total,
            "passed_attempts": passed,
            "failed_attempts": failed,
            "overall_accuracy": overall_accuracy,
            "recent_accuracy": recent_accuracy,
            "avg_time_taken": avg_time,
            "recent_avg_time": recent_avg_time,
            "avg_speed_ratio": avg_speed_ratio,
            "timeouts": timeouts,
            "consecutive_successes": consecutive_successes,
            "consecutive_failures": consecutive_failures,
            "score": score,
            "trend": trend,
            "strong_types": strong_types,
            "weak_types": weak_types,
            "type_breakdown": type_stats,
            "recent_types_history": recent_types_history
        }

    @classmethod
    def determine_recommendation(
        cls,
        analysis: Dict[str, Any],
        base_difficulty: str = "Medium",
        requested_type: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Applies adaptive cognitive progression rules and engagement optimization:
        1. Excellent performance (90%+ accuracy and fast completion) -> increase difficulty (+1).
        2. Average performance (70-89%) -> keep difficulty.
        3. Poor performance (<70% or repeated failures) -> decrease difficulty (-1).
        4. Never exceed Expert or fall below Beginner.
        5. Engagement optimization: anti-repetition and gradual promotion.
        """
        total = analysis["total_attempts"]
        normalized_base = normalize_difficulty(base_difficulty)

        # Default recommendation if no prior attempts
        if total == 0:
            pref_type = requested_type if (requested_type and requested_type.lower() != "none") else "Math Problems"
            return {
                "recommended_difficulty": normalized_base,
                "recommended_challenge_type": pref_type,
                "reason": f"Initial baseline difficulty set to {normalized_base}.",
                "analysis": analysis
            }

        recent_acc = analysis["recent_accuracy"]
        recent_avg_time = analysis["recent_avg_time"]
        avg_speed_ratio = analysis["avg_speed_ratio"]
        consec_succ = analysis["consecutive_successes"]
        consec_fail = analysis["consecutive_failures"]
        recent_history = analysis["recent_types_history"]
        strong_types = analysis["strong_types"]
        weak_types = analysis["weak_types"]
        type_breakdown = analysis["type_breakdown"]

        current_diff = normalized_base
        new_diff = current_diff
        diff_reason_parts = []

        # Progression Rules:
        # 1. Poor Performance (<70% recent accuracy OR >=2 consecutive failures OR >=2 recent failures)
        if recent_acc < 70.0 or consec_fail >= 2:
            new_diff = step_difficulty(current_diff, -1)
            if consec_fail >= 2:
                diff_reason_parts.append(
                    f"Reduced difficulty from {current_diff} to {new_diff} due to {consec_fail} consecutive unsuccessful attempts"
                )
            else:
                diff_reason_parts.append(
                    f"Reduced difficulty from {current_diff} to {new_diff} due to {recent_acc:.0f}% recent accuracy (<70% threshold)"
                )

        # 2. Excellent Performance (>=90% recent accuracy AND fast completion speed AND >=2 consecutive successes)
        elif recent_acc >= 90.0 and (avg_speed_ratio <= 0.65 or recent_avg_time <= 15.0) and consec_fail == 0:
            # Gradual promotion: require at least 2 consecutive successes to step up
            if consec_succ >= 2 or total >= 3:
                new_diff = step_difficulty(current_diff, +1)
                diff_reason_parts.append(
                    f"Increased difficulty from {current_diff} to {new_diff} based on {recent_acc:.0f}% accuracy and fast response time ({recent_avg_time:.1f}s avg)"
                )
            else:
                new_diff = current_diff
                diff_reason_parts.append(
                    f"Maintained {current_diff} difficulty to confirm consistency before upgrading"
                )

        # 3. Average Performance (70% - 89%)
        else:
            new_diff = current_diff
            diff_reason_parts.append(
                f"Maintained {current_diff} difficulty with steady {recent_acc:.0f}% accuracy"
            )

        # Challenge Type & Engagement Selection:
        resolved_type = requested_type if (requested_type and requested_type.lower() != "none") else None
        type_reason_parts = []

        # Check for repetition in recent 2-3 attempts (e.g. 2 or more of the same type in a row)
        repetition_detected = False
        if len(recent_history) >= 2 and recent_history[0] == recent_history[1]:
            repetition_detected = True
            repeated_type = recent_history[0]

        if not resolved_type:
            # Automatic selection based on variety and strengths
            if repetition_detected:
                candidate_types = [t for t in ALLOWED_TYPES if t != repeated_type]
                strong_candidates = [t for t in strong_types if t != repeated_type]
                
                if strong_candidates:
                    resolved_type = strong_candidates[0]
                    type_reason_parts.append(
                        f"Selected '{resolved_type}' (strong domain, {type_breakdown.get(resolved_type, {}).get('accuracy', 85)}% acc) to avoid repeating '{repeated_type}'"
                    )
                else:
                    resolved_type = min(candidate_types, key=lambda t: type_breakdown.get(t, {}).get("attempts", 0))
                    type_reason_parts.append(
                        f"Rotated to '{resolved_type}' for variety to avoid repeating '{repeated_type}'"
                    )
            elif strong_types:
                resolved_type = strong_types[0]
                type_reason_parts.append(
                    f"Selected strong challenge domain '{resolved_type}' ({type_breakdown.get(resolved_type, {}).get('accuracy', 90)}% accuracy)"
                )
            else:
                resolved_type = "Math Problems"
                type_reason_parts.append(f"Selected standard '{resolved_type}'")
        else:
            # If a specific type was requested by alarm/user, check domain-specific calibration
            domain_stats = type_breakdown.get(resolved_type, {})
            domain_acc = domain_stats.get("accuracy", 0.0)
            domain_attempts = domain_stats.get("attempts", 0)

            if domain_attempts >= 2:
                if domain_acc >= 90.0:
                    domain_diff = "Hard" if normalized_base in ["Beginner", "Easy", "Medium"] else step_difficulty(normalized_base, +1)
                    if domain_diff != new_diff:
                        new_diff = domain_diff
                        diff_reason_parts.append(
                            f"Applied domain boost to {new_diff} for high mastery in {resolved_type} ({domain_acc:.0f}% acc)"
                        )
                elif domain_acc < 70.0:
                    domain_diff = "Easy" if normalized_base in ["Hard", "Expert", "Medium"] else "Beginner"
                    if domain_diff != new_diff:
                        new_diff = domain_diff
                        diff_reason_parts.append(
                            f"Adjusted to {new_diff} in {resolved_type} to support skill recovery ({domain_acc:.0f}% acc)"
                        )

            if repetition_detected and resolved_type == repeated_type:
                type_reason_parts.append(
                    f"Proceeding with configured '{resolved_type}' (note: consecutive repetition detected)"
                )
            else:
                type_reason_parts.append(f"Using configured challenge type '{resolved_type}'")

        # Compile final human-readable reason
        full_reason = ". ".join(diff_reason_parts + type_reason_parts) + "."

        return {
            "recommended_difficulty": new_diff,
            "recommended_challenge_type": resolved_type,
            "reason": full_reason,
            "analysis": analysis
        }


def get_adaptive_recommendation(
    db: Session,
    user_id: int,
    base_difficulty: str = "Medium",
    preferred_type: Optional[str] = None
) -> Dict[str, Any]:
    """
    Main entry point for fetching the full adaptive challenge recommendation for a user.
    """
    if not user_id:
        norm = normalize_difficulty(base_difficulty)
        pref = preferred_type if (preferred_type and preferred_type.lower() != "none") else "Math Problems"
        return {
            "recommended_difficulty": norm,
            "recommended_challenge_type": pref,
            "reason": f"Baseline difficulty set to {norm}.",
            "analysis": AdaptiveDifficultyEngine.analyze_user_performance([])
        }

    try:
        attempts = (
            db.query(ChallengeAttempt)
            .filter(ChallengeAttempt.user_id == user_id)
            .order_by(desc(ChallengeAttempt.created_at))
            .all()
        )

        analysis = AdaptiveDifficultyEngine.analyze_user_performance(attempts)
        return AdaptiveDifficultyEngine.determine_recommendation(
            analysis=analysis,
            base_difficulty=base_difficulty,
            requested_type=preferred_type
        )
    except Exception as e:
        logger.error(f"Error computing adaptive recommendation for user {user_id}: {e}", exc_info=True)
        norm = normalize_difficulty(base_difficulty)
        pref = preferred_type if (preferred_type and preferred_type.lower() != "none") else "Math Problems"
        return {
            "recommended_difficulty": norm,
            "recommended_challenge_type": pref,
            "reason": f"Default fallback difficulty set to {norm}.",
            "analysis": AdaptiveDifficultyEngine.analyze_user_performance([])
        }


def calculate_personalized_difficulty(db: Session, user_id: int, base_difficulty: str = "Medium") -> str:
    """
    Backwards-compatible helper returning solely the recommended difficulty string.
    """
    rec = get_adaptive_recommendation(db=db, user_id=user_id, base_difficulty=base_difficulty)
    return rec["recommended_difficulty"]
