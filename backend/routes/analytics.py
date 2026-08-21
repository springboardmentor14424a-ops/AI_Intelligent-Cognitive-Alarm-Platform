import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc, func

from database import get_db
from models import ChallengeAttempt, User
from routes.auth import get_current_user
from services.personalization_service import (
    get_adaptive_recommendation,
    calculate_personalized_difficulty,
    normalize_difficulty,
    DIFFICULTY_LEVELS
)
from services.gemini_service import ALLOWED_TYPES
from schemas import AdaptiveRecommendationResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/analytics", tags=["Performance & Analytics"])

@router.get("/summary")
def get_analytics_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns high-level performance analytics summary for the currently logged-in user:
    - overall_accuracy (%)
    - total_challenges
    - passed_challenges
    - failed_challenges
    - average_completion_time (seconds)
    - current_streak (consecutive active days with passed challenges)
    - recommended_difficulty
    - preferred_challenge_type
    - recommendation_reason
    - cognitive_score
    - trend
    - strong_types
    - weak_types
    """
    attempts = (
        db.query(ChallengeAttempt)
        .filter(ChallengeAttempt.user_id == current_user.id)
        .order_by(desc(ChallengeAttempt.created_at))
        .all()
    )

    rec = get_adaptive_recommendation(db, current_user.id, "Medium")
    analysis = rec["analysis"]

    total = analysis["total_attempts"]
    passed = analysis["passed_attempts"]
    failed = analysis["failed_attempts"]
    overall_accuracy = analysis["overall_accuracy"]
    avg_time = analysis["avg_time_taken"]

    # Calculate streak (consecutive calendar days going back from today with at least 1 passed attempt)
    passed_dates = (
        db.query(func.date(ChallengeAttempt.created_at))
        .filter(ChallengeAttempt.user_id == current_user.id, ChallengeAttempt.is_correct == True)
        .group_by(func.date(ChallengeAttempt.created_at))
        .all()
    )
    
    unique_dates = {str(d[0]) for d in passed_dates if d[0]}
    
    streak = 0
    today = datetime.now().date()
    for i in range(365):
        check_date = str(today - timedelta(days=i))
        if check_date in unique_dates:
            streak += 1
        elif i == 0:
            # Today might not have passed challenge yet, check yesterday
            continue
        else:
            break

    return {
        "user_id": current_user.id,
        "overall_accuracy": overall_accuracy,
        "total_challenges": total,
        "passed_challenges": passed,
        "failed_challenges": failed,
        "average_completion_time": avg_time,
        "current_streak": streak,
        "recommended_difficulty": rec["recommended_difficulty"],
        "preferred_challenge_type": rec["recommended_challenge_type"],
        "recommendation_reason": rec["reason"],
        "cognitive_score": analysis.get("score", 50.0),
        "trend": analysis.get("trend", "stable"),
        "strong_types": analysis.get("strong_types", []),
        "weak_types": analysis.get("weak_types", [])
    }

@router.get("/adaptive-profile", response_model=AdaptiveRecommendationResponse)
def get_adaptive_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns full Adaptive Difficulty Engine profile and breakdown for the logged-in user.
    """
    rec = get_adaptive_recommendation(db, current_user.id, "Medium")
    analysis = rec["analysis"]

    return AdaptiveRecommendationResponse(
        user_id=current_user.id,
        recommended_difficulty=rec["recommended_difficulty"],
        recommended_challenge_type=rec["recommended_challenge_type"],
        reason=rec["reason"],
        strong_types=analysis.get("strong_types", []),
        weak_types=analysis.get("weak_types", []),
        score=analysis.get("score", 50.0),
        trend=analysis.get("trend", "stable"),
        analysis=analysis
    )

@router.get("/by-type")
def get_analytics_by_type(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns accuracy and performance metrics grouped by challenge type for the logged-in user.
    """
    attempts = (
        db.query(ChallengeAttempt)
        .filter(ChallengeAttempt.user_id == current_user.id)
        .all()
    )

    by_type: Dict[str, dict] = {}
    for t in ALLOWED_TYPES:
        by_type[t] = {
            "challenge_type": t,
            "total_attempts": 0,
            "passed": 0,
            "failed": 0,
            "accuracy_percentage": 0.0,
            "avg_time_taken": 0.0
        }

    for a in attempts:
        ctype = a.challenge_type or "Math Problems"
        if ctype not in by_type:
            by_type[ctype] = {
                "challenge_type": ctype,
                "total_attempts": 0,
                "passed": 0,
                "failed": 0,
                "accuracy_percentage": 0.0,
                "avg_time_taken": 0.0
            }
        
        by_type[ctype]["total_attempts"] += 1
        if a.is_correct:
            by_type[ctype]["passed"] += 1
        else:
            by_type[ctype]["failed"] += 1
        by_type[ctype]["avg_time_taken"] += (a.time_taken or 0)

    result = []
    for ctype, data in by_type.items():
        tot = data["total_attempts"]
        if tot > 0:
            data["accuracy_percentage"] = round((data["passed"] / tot * 100.0), 1)
            data["avg_time_taken"] = round((data["avg_time_taken"] / tot), 1)
        result.append(data)

    return result

@router.get("/by-difficulty")
def get_analytics_by_difficulty(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns accuracy and performance metrics grouped by difficulty for the logged-in user.
    """
    attempts = (
        db.query(ChallengeAttempt)
        .filter(ChallengeAttempt.user_id == current_user.id)
        .all()
    )

    by_diff: Dict[str, dict] = {}
    for d in DIFFICULTY_LEVELS:
        by_diff[d] = {
            "difficulty": d,
            "total_attempts": 0,
            "passed": 0,
            "failed": 0,
            "accuracy_percentage": 0.0,
            "avg_time_taken": 0.0
        }

    for a in attempts:
        diff = normalize_difficulty(a.difficulty or "Medium")
        if diff not in by_diff:
            by_diff[diff] = {
                "difficulty": diff,
                "total_attempts": 0,
                "passed": 0,
                "failed": 0,
                "accuracy_percentage": 0.0,
                "avg_time_taken": 0.0
            }
        
        by_diff[diff]["total_attempts"] += 1
        if a.is_correct:
            by_diff[diff]["passed"] += 1
        else:
            by_diff[diff]["failed"] += 1
        by_diff[diff]["avg_time_taken"] += (a.time_taken or 0)

    result = []
    for diff in DIFFICULTY_LEVELS:
        data = by_diff[diff]
        tot = data["total_attempts"]
        if tot > 0:
            data["accuracy_percentage"] = round((data["passed"] / tot * 100.0), 1)
            data["avg_time_taken"] = round((data["avg_time_taken"] / tot), 1)
        result.append(data)

    return result

@router.get("/history")
def get_analytics_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns daily performance history and recent individual attempt logs for the logged-in user.
    """
    attempts = (
        db.query(ChallengeAttempt)
        .filter(ChallengeAttempt.user_id == current_user.id)
        .order_by(desc(ChallengeAttempt.created_at))
        .all()
    )

    daily_map: Dict[str, dict] = {}
    recent_logs = []

    for a in attempts:
        dt_str = a.created_at.strftime("%Y-%m-%d") if a.created_at else datetime.now().strftime("%Y-%m-%d")
        if dt_str not in daily_map:
            daily_map[dt_str] = {
                "date": dt_str,
                "total_attempts": 0,
                "passed": 0,
                "failed": 0,
                "accuracy_percentage": 0.0,
                "avg_time_taken": 0.0
            }
        
        daily_map[dt_str]["total_attempts"] += 1
        if a.is_correct:
            daily_map[dt_str]["passed"] += 1
        else:
            daily_map[dt_str]["failed"] += 1
        daily_map[dt_str]["avg_time_taken"] += (a.time_taken or 0)

        if len(recent_logs) < 20:
            recent_logs.append({
                "id": a.id,
                "date": a.created_at.strftime("%Y-%m-%d %H:%M") if a.created_at else "Just Now",
                "challenge_type": a.challenge_type,
                "difficulty": a.difficulty,
                "question": a.question,
                "user_answer": a.user_answer,
                "correct_answer": a.correct_answer,
                "is_correct": a.is_correct,
                "attempt_number": a.attempt_number,
                "time_taken": a.time_taken,
                "time_limit": a.time_limit
            })

    daily_history = []
    for dt_str in sorted(daily_map.keys()):
        data = daily_map[dt_str]
        tot = data["total_attempts"]
        if tot > 0:
            data["accuracy_percentage"] = round((data["passed"] / tot * 100.0), 1)
            data["avg_time_taken"] = round((data["avg_time_taken"] / tot), 1)
        daily_history.append(data)

    return {
        "daily_history": daily_history,
        "recent_logs": recent_logs
    }
