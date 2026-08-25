"""
Recommendation Engine for Intelligent Cognitive Alarm Platform
Provides:
1. Sleep improvement recommendations
2. Wake-up optimization suggestions
3. Habit improvement guidance
4. Productivity recommendations
5. Personalized challenge recommendations
"""

import datetime
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from database import User, UserProfile, Alarm, ChallengePerformance, WakeLog, HabitScoreLog
from ml_engine import MLEngine


class RecommendationEngine:
    """Comprehensive multi-pillar recommendation generator."""

    @classmethod
    def get_sleep_improvement_recommendations(cls, user_id: int, db: Session) -> Dict[str, Any]:
        """1. Sleep improvement recommendations."""
        user = db.query(User).filter(User.id == user_id).first()
        profile = user.profile if user else None
        target_wake = profile.wake_up_time if profile and profile.wake_up_time else "07:00"
        duration = profile.sleep_duration if profile and profile.sleep_duration else 8.0

        # Calculate optimal bedtime
        try:
            wh, wm = map(int, target_wake.split(":"))
            wake_mins = wh * 60 + wm
            sleep_mins = int(duration * 60)
            bedtime_mins = (wake_mins - sleep_mins) % 1440
            bh, bm = divmod(bedtime_mins, 60)
            optimal_bedtime = f"{bh:02d}:{bm:02d}"
            wind_down_time = f"{(bh if bm >= 45 else (bh - 1) % 24):02d}:{(bm - 45) % 60:02d}"
        except Exception:
            optimal_bedtime = "23:00"
            wind_down_time = "22:15"

        tips = [
            f"Set your wind-down alarm for {wind_down_time} to allow 45 minutes of screen-free relaxation before sleep at {optimal_bedtime}.",
            f"Maintain your target {duration:.1f}-hour sleep cycle to prevent morning adenosine buildup.",
            "Keep bedroom ambient temperature between 18°C–20°C (65°F–68°F) for deeper REM and NREM Stage 3 sleep.",
            "Eliminate blue light exposure at least 30 minutes prior to planned bedtime to boost natural melatonin secretion."
        ]

        return {
            "optimal_bedtime": optimal_bedtime,
            "wind_down_reminder_time": wind_down_time,
            "target_sleep_duration_hours": duration,
            "category": "Sleep Improvement",
            "recommendations": tips
        }

    @classmethod
    def get_wake_up_optimization_suggestions(cls, user_id: int, db: Session) -> Dict[str, Any]:
        """2. Wake-up optimization suggestions."""
        user = db.query(User).filter(User.id == user_id).first()
        profile = user.profile if user else None
        alarms = db.query(Alarm).filter(Alarm.user_id == user_id).all()
        snooze_count = sum(a.snooze_count for a in alarms)
        target_wake = profile.wake_up_time if profile and profile.wake_up_time else "07:00"

        optimization_steps = [
            "Expose eyes to natural sunlight within 10 minutes of waking to trigger cortisol awakening response (CAR).",
            "Hydrate with 500ml of water immediately upon alarm dismissal to reverse overnight cellular dehydration.",
            "Use progressive gradient chime sounds rather than jarring tones to minimize sympathetic nervous system panic.",
            "Complete a 2-minute dynamic stretch routine to stimulate blood flow and dispel sleep inertia."
        ]

        if snooze_count > 2:
            optimization_steps.insert(0, "High snooze tendency detected: enable 'Multi-Step Verification' to ensure prefrontal cortex activation.")

        return {
            "category": "Wake-Up Optimization",
            "target_wake_time": target_wake,
            "primary_action": "Sunlight & Hydration Protocol",
            "recommended_sound": "Chimes" if not profile or not hasattr(profile, 'preferred_alarm_sound') or not profile.preferred_alarm_sound else profile.preferred_alarm_sound,
            "optimization_steps": optimization_steps
        }

    @classmethod
    def get_habit_improvement_guidance(cls, user_id: int, db: Session) -> Dict[str, Any]:
        """3. Habit improvement guidance."""
        user = db.query(User).filter(User.id == user_id).first()
        profile = user.profile if user else None
        streak = profile.streak if profile else 0
        habit_score = profile.habit_score if profile else 50

        next_milestone = ((streak // 7) + 1) * 7
        days_away = max(1, next_milestone - streak)

        guidance = [
            f"You are {days_away} days away from the {next_milestone}-Day Streak Trophy. Protect your morning routine!",
            f"Your current Habit Score is {habit_score}/100. Wake-Up Consistency contributes 35% to this score.",
            "Avoid shifting weekend wake-up times by more than 45 minutes to prevent 'social jetlag'.",
            "Track daily check-ins on your dashboard to reinforce positive neuroplastic habit loops."
        ]

        return {
            "category": "Habit Improvement",
            "current_streak": streak,
            "target_milestone": next_milestone,
            "days_away": days_away,
            "guidance": guidance
        }

    @classmethod
    def get_productivity_recommendations(cls, user_id: int, db: Session) -> Dict[str, Any]:
        """4. Productivity recommendations."""
        perfs = db.query(ChallengePerformance).filter(ChallengePerformance.user_id == user_id).limit(10).all()
        avg_speed = sum(p.time_taken for p in perfs) / len(perfs) if perfs else 18.0

        focus_window = "08:30 - 11:30 AM" if avg_speed <= 20 else "09:30 - 12:00 PM"

        recommendations = [
            f"Your prime cognitive focus window is calculated at {focus_window}.",
            "Schedule your highest-priority creative or analytical tasks during your morning peak window.",
            "Delay high caffeine consumption until 60–90 minutes after waking to let natural adenosine clearance occur.",
            "Practice the Pomodoro technique (50m focus / 10m pause) during post-wake high alertness intervals."
        ]

        return {
            "category": "Productivity & Focus",
            "peak_cognitive_window": focus_window,
            "alertness_level": "High & Sharp" if avg_speed <= 20 else "Moderate",
            "recommendations": recommendations
        }

    @classmethod
    def get_personalized_challenge_recommendations(cls, user_id: int, db: Session) -> Dict[str, Any]:
        """5. Personalized challenge recommendations."""
        rankings = MLEngine.get_personalized_challenge_ranking(user_id, db)
        user = db.query(User).filter(User.id == user_id).first()
        profile = user.profile if user else None
        
        top_challenge = rankings[0]["challenge_type"] if rankings else "Math Problems"
        top_acc = rankings[0]["accuracy"] if rankings else 80.0
        
        # Adaptive difficulty selection
        habit_score = profile.habit_score if profile else 50
        if habit_score >= 80 and top_acc >= 85:
            rec_diff = "Hard"
            rec_method = "Multi-Step Challenges"
        elif habit_score >= 50 and top_acc >= 65:
            rec_diff = "Medium"
            rec_method = "Puzzle Completion"
        else:
            rec_diff = "Easy"
            rec_method = "Consecutive Correct Answers"

        reason = f"Based on your {top_acc:.0f}% accuracy in '{top_challenge}', this challenge type clears your sleep inertia {15 if top_acc >= 80 else 5}% faster than baseline."

        return {
            "category": "Personalized Challenge Recommendations",
            "recommended_challenge_type": top_challenge,
            "recommended_difficulty": rec_diff,
            "recommended_verification_method": rec_method,
            "personalization_reason": reason,
            "rankings": rankings
        }

    @classmethod
    def get_unified_recommendation_dossier(cls, user_id: int, db: Session) -> Dict[str, Any]:
        """Compiles all 5 recommendation domains into a structured payload."""
        return {
            "sleep_improvement": cls.get_sleep_improvement_recommendations(user_id, db),
            "wake_up_optimization": cls.get_wake_up_optimization_suggestions(user_id, db),
            "habit_improvement": cls.get_habit_improvement_guidance(user_id, db),
            "productivity": cls.get_productivity_recommendations(user_id, db),
            "personalized_challenges": cls.get_personalized_challenge_recommendations(user_id, db)
        }
