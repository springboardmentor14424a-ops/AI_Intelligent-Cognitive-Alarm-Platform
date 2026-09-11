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
from database import User, UserProfile, Alarm, ChallengePerformance, WakeLog, HabitScoreLog, ActivityLog, SleepAdherenceLog


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
        Based on planned sleep duration, target bedtime alignment, and sleep adherence Yes/No check-ins.
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
            base_duration_score = 95.0
        elif diff_hours <= 1.0:
            base_duration_score = 80.0
        elif diff_hours <= 2.0:
            base_duration_score = 65.0
        else:
            base_duration_score = 45.0

        # Check latest sleep adherence check-in (Yes / No)
        latest_adherence = (
            db.query(SleepAdherenceLog)
            .filter(SleepAdherenceLog.user_id == user_id)
            .order_by(SleepAdherenceLog.created_at.desc())
            .first()
        )

        if latest_adherence is not None:
            # If user confirmed adhering (Yes) vs not adhering (No)
            if latest_adherence.adhered:
                check_score = latest_adherence.score or 95.0
                score = (check_score * 0.75) + (base_duration_score * 0.25)
            else:
                check_score = latest_adherence.score or 45.0
                score = min(50.0, (check_score * 0.75) + (base_duration_score * 0.25))
            return round(max(10.0, min(100.0, score)), 1)

        return round(max(10.0, min(100.0, base_duration_score)), 1)

    @classmethod
    def calculate_sleep_routine_score(cls, user_id: int, db: Session) -> float:
        """Alias for calculate_sleep_schedule_adherence_score (Sleep Routine Scoring)."""
        return cls.calculate_sleep_schedule_adherence_score(user_id, db)

    @classmethod
    def calculate_productivity_score(cls, user_id: int, db: Session) -> float:
        """
        Calculates Overall Productivity Score (0 - 100).
        Correlates waking consistency, challenge completion, and sleep schedule adherence.
        """
        consistency = cls.calculate_wake_up_consistency_score(user_id, db)
        challenge = cls.calculate_challenge_completion_score(user_id, db)
        sleep_adherence = cls.calculate_sleep_schedule_adherence_score(user_id, db)
        score = (consistency * 0.40) + (challenge * 0.40) + (sleep_adherence * 0.20)
        return round(max(10.0, min(100.0, score)), 1)

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
            "productivity_score": sub_prod,
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

    @classmethod
    def record_sleep_adherence_check(
        cls, user_id: int, adhered: bool, notes: Optional[str], db: Session
    ) -> Dict[str, Any]:
        """
        Record user response to 'Did you adhere to your sleep schedule? (Yes / No)'
        and apply the designated score to Module 8 Habit Scoring Model.
        """
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise ValueError(f"User {user_id} not found")

        profile = user.profile
        if not profile:
            profile = UserProfile(user_id=user.id)
            db.add(profile)
            db.commit()

        target_bed = profile.sleep_time or "22:30"
        target_wake = profile.wake_up_time or "07:00"

        # Award specific score for Yes vs No
        score_awarded = 95.0 if adhered else 45.0

        log_entry = SleepAdherenceLog(
            user_id=user_id,
            adhered=adhered,
            target_bedtime=target_bed,
            target_wake_time=target_wake,
            score=score_awarded,
            notes=notes or ("Adhered to target bedtime" if adhered else "Missed target bedtime")
        )
        db.add(log_entry)

        act = ActivityLog(
            user_id=user_id,
            action="Sleep Adherence Check",
            details=f"User responded {'YES' if adhered else 'NO'} to sleep schedule adherence (Score: {score_awarded})"
        )
        db.add(act)
        db.commit()

        # Recalculate complete habit score
        habit_summary = cls.compute_and_persist_habit_score(user_id, db)

        status_msg = (
            "Sleep schedule adherence confirmed! Excellent consistency (+95 adherence rating)."
            if adhered
            else "Sleep schedule disruption noted. Score adjusted with recovery guidance."
        )

        return {
            "success": True,
            "adhered": adhered,
            "awarded_adherence_score": score_awarded,
            "awarded_score": score_awarded,
            "status_message": status_msg,
            "habit_score": habit_summary["habit_score"],
            "new_habit_score": habit_summary["habit_score"],
            "productivity_score": habit_summary["productivity_score"],
            "grade": habit_summary["grade"],
            "status_description": habit_summary["status_description"],
            "subscores": habit_summary["subscores"],
            "weights": habit_summary["weights"]
        }

    @classmethod
    def update_circadian_targets(
        cls, user_id: int, bed_time: str, wake_up_time: str, sleep_duration: Optional[float], db: Session
    ) -> Dict[str, Any]:
        """
        Ask user for bedtime and wake-up time, and use them to update:
        - Wake-up consistency scoring
        - Habit adherence scoring
        - Challenge completion scoring
        - Productivity scoring
        - Sleep routine scoring
        - Weighted Scoring Model (35% Wake, 25% Challenge, 20% Snooze, 20% Sleep)
        """
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise ValueError(f"User {user_id} not found")

        profile = user.profile
        if not profile:
            profile = UserProfile(user_id=user.id)
            db.add(profile)

        # Clean strings
        bed_time = bed_time.strip()
        wake_up_time = wake_up_time.strip()

        # Calculate planned duration if not explicitly provided
        if sleep_duration is None or sleep_duration <= 0:
            try:
                sh, sm = map(int, bed_time.split(":"))
                wh, wm = map(int, wake_up_time.split(":"))
                mins = (wh * 60 + wm) - (sh * 60 + sm)
                if mins < 0:
                    mins += 1440
                sleep_duration = round(mins / 60.0, 1)
            except Exception:
                sleep_duration = 8.0

        profile.sleep_time = bed_time
        profile.wake_up_time = wake_up_time
        profile.sleep_duration = float(sleep_duration)

        act = ActivityLog(
            user_id=user_id,
            action="Update Circadian Target",
            details=f"Updated Bedtime: {bed_time}, Wake-Up: {wake_up_time}, Target Duration: {sleep_duration}h"
        )
        db.add(act)
        db.commit()

        # Recalculate complete weighted model
        updated_habit = cls.compute_and_persist_habit_score(user_id, db)

        return {
            "success": True,
            "message": "Circadian targets updated and habit scoring re-evaluated successfully.",
            "bed_time": bed_time,
            "wake_up_time": wake_up_time,
            "target_bedtime": bed_time,
            "target_wake_up_time": wake_up_time,
            "target_sleep_duration": sleep_duration,
            "habit_score": updated_habit["habit_score"],
            "updated_habit_score": updated_habit["habit_score"],
            "productivity_score": updated_habit["productivity_score"],
            "grade": updated_habit["grade"],
            "status_description": updated_habit["status_description"],
            "subscores": updated_habit["subscores"],
            "weights": updated_habit["weights"]
        }
