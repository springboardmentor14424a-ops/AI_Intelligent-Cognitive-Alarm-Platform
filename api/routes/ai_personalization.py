"""
AI Personalization & Machine Learning Endpoints
Module 5: Production, AI Improvement & Maintenance
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db, User, UserProfile, ActivityLog
import auth
from ml_engine import MLEngine
from notification_service import send_bedtime_reminder, send_habit_reminder, send_progress_notification

router = APIRouter()


@router.get("/predictions")
def get_ai_predictions(
    db: Session = Depends(get_db),
    current_user: User = Depends(auth.get_current_user)
):
    """
    Task 1: Predict snooze and oversleep risk probability for the authenticated user.
    """
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    predictions = MLEngine.predict_snooze_and_oversleep_risk(current_user.id, db)
    return predictions


@router.get("/personalization-summary")
def get_personalization_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(auth.get_current_user)
):
    """
    Task 2: Advanced Personalization — circadian recommendations, optimal wake-up window,
    challenge type ranking, and adaptive difficulty recommendation.
    """
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    summary = MLEngine.get_circadian_recommendations(current_user.id, db)
    return summary


@router.get("/challenge-rankings")
def get_challenge_rankings(
    db: Session = Depends(get_db),
    current_user: User = Depends(auth.get_current_user)
):
    """
    Task 2: Returns ranking of all 7 challenge types based on user's waking inertia clearance.
    """
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    rankings = MLEngine.get_personalized_challenge_ranking(current_user.id, db)
    return {"user_id": current_user.id, "rankings": rankings}


@router.post("/apply-recommendations")
def apply_ai_recommendations(
    db: Session = Depends(get_db),
    current_user: User = Depends(auth.get_current_user)
):
    """
    Task 2: One-click application of AI recommended wake-up time, bedtime, and challenge preference.
    """
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    summary = MLEngine.get_circadian_recommendations(current_user.id, db)
    profile = current_user.profile
    if not profile:
        profile = UserProfile(user_id=current_user.id)
        db.add(profile)

    profile.wake_up_time = summary["target_wake_up"]
    profile.sleep_time = summary["optimal_bedtime"]
    profile.challenge_preference = summary["recommended_challenge_type"]
    profile.difficulty_level = summary["recommended_difficulty"].lower()

    log = ActivityLog(
        user_id=current_user.id,
        action="AI Personalization Applied",
        details=f"Applied AI recommended challenge '{summary['recommended_challenge_type']}' ({summary['recommended_difficulty']}) & bedtime {summary['optimal_bedtime']}"
    )
    db.add(log)
    db.commit()

    return {
        "success": True,
        "message": f"AI recommendations applied! Challenge preference set to '{summary['recommended_challenge_type']}' and bedtime optimized to {summary['optimal_bedtime']}.",
        "applied_settings": {
            "wake_up_time": profile.wake_up_time,
            "sleep_time": profile.sleep_time,
            "challenge_preference": profile.challenge_preference,
            "difficulty_level": profile.difficulty_level
        }
    }


@router.get("/performance-analysis")
def get_user_performance_analysis(
    challenge_type: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(auth.get_current_user)
):
    """
    Task 5.1: User Performance Analysis across accuracy, response time, win rate, and mastery.
    """
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    return MLEngine.analyze_user_performance(current_user.id, db, challenge_type=challenge_type)


@router.get("/difficulty-adjustment")
def get_difficulty_adjustment(
    challenge_type: str = "Math Problems",
    current_difficulty: str = "Medium",
    db: Session = Depends(get_db),
    current_user: User = Depends(auth.get_current_user)
):
    """
    Task 5.2: Real-time difficulty adjustment across [Beginner, Easy, Medium, Hard, Expert].
    """
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    return MLEngine.calculate_difficulty_adjustment(current_user.id, challenge_type, current_difficulty, db)


@router.get("/learning-patterns")
def get_learning_patterns(
    db: Session = Depends(get_db),
    current_user: User = Depends(auth.get_current_user)
):
    """
    Task 5.3: Learning pattern trajectory and cognitive retention index.
    """
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    return MLEngine.analyze_learning_patterns(current_user.id, db)


@router.get("/engagement-optimization")
def get_engagement_optimization(
    db: Session = Depends(get_db),
    current_user: User = Depends(auth.get_current_user)
):
    """
    Task 5.4 & 5.5: Unified Challenge Personalization and Engagement Optimization protocol.
    """
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    return MLEngine.optimize_engagement(current_user.id, db)


@router.post("/test-notification")
def test_notification(
    notif_type: str = "bedtime",
    db: Session = Depends(get_db),
    current_user: User = Depends(auth.get_current_user)
):
    """
    Task 3: Test dispatch for real-time notifications (bedtime, habit, progress).
    """
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    profile = current_user.profile
    fcm = getattr(current_user, "fcm_token", None)

    if notif_type == "bedtime":
        st = profile.sleep_time if profile and profile.sleep_time else "22:30"
        wt = profile.wake_up_time if profile and profile.wake_up_time else "07:00"
        res = send_bedtime_reminder(current_user.id, st, wt, fcm)
        msg = f"Bedtime reminder sent for {st} sleep target."
    elif notif_type == "habit":
        streak = profile.streak if profile else 0
        hs = profile.habit_score if profile else 50
        res = send_habit_reminder(current_user.id, streak, hs, fcm)
        msg = f"Habit reminder sent for {streak} days streak."
    else:
        res = send_progress_notification(current_user.id, 180.0, 92.0, fcm)
        msg = "Weekly progress digest notification sent."

    return {"success": bool(res), "message": msg}

