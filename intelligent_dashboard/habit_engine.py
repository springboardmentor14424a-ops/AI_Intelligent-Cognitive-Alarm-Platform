"""
Habit Scoring Engine for Intelligent Cognitive Alarm Platform
Implements the exact weighted scoring model:
  Habit Score =
    Wake-Up Consistency (35%)
  + Challenge Completion Success (25%)
  + Snooze Reduction (20%)
  + Sleep Schedule Adherence (20%)

Also calculates Productivity Score, logs historical metrics to HabitScoreLog,
and updates UserProfile in real-time.
"""

import datetime
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from database import User, UserProfile, Alarm, ChallengePerformance, WakeLog, HabitScoreLog, ActivityLog


class HabitScoringEngine:
    """Calculates weighted habit adherence and subscore breakdowns."""

    # Weights
    WEIGHT_WAKE_UP_CONSISTENCY = 0.35
    WEIGHT_CHALLENGE_COMPLETION = 0.25
    WEIGHT_SNOOZE_REDUCTION = 0.20
    WEIGHT_SLEEP_ADHERENCE = 0.20

    @classmethod
    def calculate_wake_up_consistency_score(cls, user_id: int, db: Session) -> float:
        """
        1. Wake-Up Consistency Scoring (35% weight):
        Based on streak stability, drift from scheduled wake-up time, and morning regularity.
        """
        user = db.query(User).filter(User.id == user_id).first()
        profile = user.profile if user else None
        streak = profile.streak if profile else 0

        wake_logs: List[WakeLog] = (
            db.query(WakeLog)
            .filter(WakeLog.user_id == user_id)
            .order_by(WakeLog.created_at.desc())
            .limit(10)
            .all()
        )

        if not wake_logs:
            # Baseline from streak
            base = 50.0 + min(40.0, streak * 5.0)
            return round(max(10.0, min(100.0, base)), 1)

        # Average drift penalty
        avg_drift = sum(abs(w.drift_minutes or 0.0) for w in wake_logs) / len(wake_logs)
        drift_factor = max(0.0, 100.0 - (avg_drift * 4.0))

        # Streak factor
        streak_factor = min(100.0, streak * 7.5)

        # On-time ratio
        on_time_count = sum(1 for w in wake_logs if abs(w.drift_minutes or 0.0) <= 5.0)
        on_time_rate = (on_time_count / len(wake_logs)) * 100.0

        score = (drift_factor * 0.4) + (on_time_rate * 0.4) + (streak_factor * 0.2)
        return round(max(10.0, min(100.0, score)), 1)

    @classmethod
    def calculate_challenge_completion_score(cls, user_id: int, db: Session) -> float:
        """
        2. Challenge Completion Scoring (25% weight):
        Based on accuracy percentage, success rate, speed factor, and failed attempts.
        """
        perfs: List[ChallengePerformance] = (
            db.query(ChallengePerformance)
            .filter(ChallengePerformance.user_id == user_id)
            .order_by(ChallengePerformance.created_at.desc())
            .limit(15)
            .all()
        )

        if not perfs:
            return 75.0

        total = len(perfs)
        succ = sum(1 for p in perfs if p.is_correct or p.status == "success")
        win_rate = (succ / total) * 100.0
        avg_acc = sum(p.accuracy or 0.0 for p in perfs) / total
        avg_time = sum(p.time_taken or 15.0 for p in perfs) / total
        
        speed_factor = max(0.0, min(100.0, 100.0 - (avg_time * 1.5)))
        score = (avg_acc * 0.45) + (win_rate * 0.35) + (speed_factor * 0.20)
        return round(max(10.0, min(100.0, score)), 1)

    @classmethod
    def calculate_snooze_reduction_score(cls, user_id: int, db: Session) -> float:
        """
        3. Snooze Reduction Scoring (20% weight):
        Ratio of zero-snooze wake-ups vs total alarms, with penalties for high snooze counts.
        """
        wake_logs: List[WakeLog] = db.query(WakeLog).filter(WakeLog.user_id == user_id).all()
        alarms: List[Alarm] = db.query(Alarm).filter(Alarm.user_id == user_id).all()

        if wake_logs:
            total_events = len(wake_logs)
            zero_snoozes = sum(1 for w in wake_logs if w.snooze_count == 0)
            avg_snooze = sum(w.snooze_count for w in wake_logs) / total_events
        elif alarms:
            total_events = len(alarms)
            total_snooze_cnt = sum(a.snooze_count for a in alarms)
            zero_snoozes = sum(1 for a in alarms if a.snooze_count == 0)
            avg_snooze = total_snooze_cnt / max(1, total_events)
        else:
            return 85.0

        zero_ratio = (zero_snoozes / max(1, total_events)) * 100.0
        snooze_penalty = min(60.0, avg_snooze * 20.0)

        score = max(0.0, zero_ratio - snooze_penalty)
        return round(max(10.0, min(100.0, score)), 1)

    @classmethod
    def calculate_sleep_schedule_adherence_score(cls, user_id: int, db: Session) -> float:
        """
        4. Sleep Routine & Schedule Adherence Scoring (20% weight):
        Based on planned sleep duration, target bedtime alignment, and sleep debt minimization.
        """
        user = db.query(User).filter(User.id == user_id).first()
        profile = user.profile if user else None

        if not profile:
            return 70.0

        target_duration = profile.sleep_duration or 8.0
        sleep_time = profile.sleep_time or "22:30"
        wake_time = profile.wake_up_time or "07:00"

        try:
            sh, sm = map(int, sleep_time.split(":"))
            wh, wm = map(int, wake_time.split(":"))
            mins = (wh * 60 + wm) - (sh * 60 + sm)
            if mins < 0:
                mins += 1440
            calc_dur = mins / 60.0
        except Exception:
            calc_dur = target_duration

        diff_hours = abs(calc_dur - target_duration)
        if diff_hours <= 0.5:
            score = 95.0
        elif diff_hours <= 1.0:
            score = 80.0
        elif diff_hours <= 2.0:
            score = 65.0
        else:
            score = 45.0

        return round(max(10.0, min(100.0, score)), 1)

    @classmethod
    def calculate_sleep_routine_score(cls, user_id: int, db: Session) -> float:
        """Alias for calculate_sleep_schedule_adherence_score (Sleep Routine Scoring)."""
        return cls.calculate_sleep_schedule_adherence_score(user_id, db)

    @classmethod
    def calculate_productivity_score(cls, user_id: int, db: Session) -> float:
        """
        Calculates Overall Productivity Score (0 - 100).
        Correlates waking consistency and cognitive efficiency.
        """
        consistency = cls.calculate_wake_up_consistency_score(user_id, db)
        challenge = cls.calculate_challenge_completion_score(user_id, db)
        return round((consistency * 0.5) + (challenge * 0.5), 1)

    @classmethod
    def calculate_habit_adherence_score(cls, user_id: int, db: Session) -> float:
        """
        Calculates overall Habit Adherence Score using the weighted model:
        35% Wake-Up Consistency + 25% Challenge Completion + 20% Snooze Reduction + 20% Sleep Adherence
        """
        result = cls.compute_and_persist_habit_score(user_id, db)
        return float(result.get("habit_score", 50.0))

    @classmethod
    def compute_and_persist_habit_score(cls, user_id: int, db: Session) -> Dict[str, Any]:
        """
        Calculates the complete weighted Habit Score according to the standard model:
          Habit Score =
            (Wake-Up Consistency * 0.35)
          + (Challenge Completion Success * 0.25)
          + (Snooze Reduction * 0.20)
          + (Sleep Schedule Adherence * 0.20)
        
        Persists to UserProfile and logs to HabitScoreLog.
        """
        sub_consistency = cls.calculate_wake_up_consistency_score(user_id, db)
        sub_challenge = cls.calculate_challenge_completion_score(user_id, db)
        sub_snooze = cls.calculate_snooze_reduction_score(user_id, db)
        sub_sleep = cls.calculate_sleep_schedule_adherence_score(user_id, db)
        sub_prod = cls.calculate_productivity_score(user_id, db)

        # Exact weighted sum
        weighted_score = round(
            (sub_consistency * cls.WEIGHT_WAKE_UP_CONSISTENCY)
            + (sub_challenge * cls.WEIGHT_CHALLENGE_COMPLETION)
            + (sub_snooze * cls.WEIGHT_SNOOZE_REDUCTION)
            + (sub_sleep * cls.WEIGHT_SLEEP_ADHERENCE),
            1
        )
        weighted_score = max(5.0, min(100.0, weighted_score))

        # Update UserProfile
        user = db.query(User).filter(User.id == user_id).first()
        if user:
            profile = user.profile
            if not profile:
                profile = UserProfile(user_id=user.id)
                db.add(profile)
            
            profile.habit_score = int(round(weighted_score))
            profile.wake_up_consistency_score = sub_consistency
            profile.challenge_completion_score = sub_challenge
            profile.snooze_reduction_score = sub_snooze
            profile.sleep_schedule_adherence_score = sub_sleep
            profile.productivity_score = sub_prod

            # Add to HabitScoreLog history
            log_entry = HabitScoreLog(
                user_id=user_id,
                habit_score=weighted_score,
                wake_up_consistency=sub_consistency,
                challenge_completion=sub_challenge,
                snooze_reduction=sub_snooze,
                sleep_schedule_adherence=sub_sleep,
                productivity_score=sub_prod
            )
            db.add(log_entry)
            db.commit()

        # Grade / Tier
        if weighted_score >= 85:
            grade = "A+ (Elite Master)"
            status_desc = "Optimal circadian alignment and exceptional cognitive discipline."
        elif weighted_score >= 70:
            grade = "B+ (Strong Routine)"
            status_desc = "Solid waking consistency with room for minor snooze optimization."
        elif weighted_score >= 50:
            grade = "C (Moderate Habit)"
            status_desc = "Routine is stabilizing. Maintain consistent sleep times to elevate score."
        else:
            grade = "D (Rebuilding Focus)"
            status_desc = "Circadian rhythm disrupted. Focus on target bedtime adherence."

        return {
            "habit_score": weighted_score,
            "grade": grade,
            "status_description": status_desc,
            "weights": {
                "wake_up_consistency": "35%",
                "challenge_completion": "25%",
                "snooze_reduction": "20%",
                "sleep_schedule_adherence": "20%"
            },
            "subscores": {
                "wake_up_consistency": sub_consistency,
                "challenge_completion": sub_challenge,
                "snooze_reduction": sub_snooze,
                "sleep_schedule_adherence": sub_sleep,
                "productivity_score": sub_prod
            }
        }
