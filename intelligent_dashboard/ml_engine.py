"""
ML Engine for Intelligent Cognitive Alarm Platform
Module 5: Production, AI Improvement & Maintenance

Provides:
1. Snooze & Oversleep Behavior Predictor (Probability estimation & Risk level)
2. Enhanced Adaptive Difficulty Progression Model
3. Personalized Challenge Type Ranking based on waking inertia clearance
4. Optimal Circadian Bedtime & Wake-Up Recommender
"""

import datetime
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from database import User, UserProfile, Alarm, ChallengePerformance, ActivityLog


class MLEngine:
    """
    Cognitive & Circadian Machine Learning Intelligence Engine.
    Combines statistical regression, moving window performance analysis,
    and heuristic decision models.
    """

    @staticmethod
    def predict_snooze_and_oversleep_risk(user_id: int, db: Session) -> Dict[str, Any]:
        """
        Task 1: Predict snooze/oversleep behavior using historical performance,
        alarm difficulty, habit score, recent snooze counts, and wake time drift.
        """
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return {
                "snooze_probability": 25.0,
                "oversleep_risk": "Low",
                "risk_score": 25,
                "factors": ["Default profile baseline"],
                "recommendation": "Maintain consistent sleep schedule."
            }

        profile = user.profile
        habit_score = profile.habit_score if profile else 50
        streak = profile.streak if profile else 0

        # Query recent performances (last 10 attempts)
        recent_perfs: List[ChallengePerformance] = (
            db.query(ChallengePerformance)
            .filter(ChallengePerformance.user_id == user_id)
            .order_by(ChallengePerformance.created_at.desc())
            .limit(10)
            .all()
        )

        # Query recent user alarms
        alarms: List[Alarm] = db.query(Alarm).filter(Alarm.user_id == user_id).all()
        recent_snoozes = sum(a.snooze_count for a in alarms)

        # Base risk calculation
        risk_score = 30.0
        factors = []

        # 1. Habit score factor (lower habit score -> higher oversleep risk)
        if habit_score < 40:
            risk_score += 25.0
            factors.append("Low habit score (<40) indicates disrupted sleep routine")
        elif habit_score > 80:
            risk_score -= 15.0
            factors.append("High habit score (>80) indicates strong circadian discipline")

        # 2. Streak factor
        if streak >= 7:
            risk_score -= 10.0
            factors.append(f"Active streak of {streak} days stabilizes waking inertia")
        elif streak == 0:
            risk_score += 10.0
            factors.append("No active streak recorded")

        # 3. Recent snooze behavior
        if recent_snoozes > 3:
            risk_score += 20.0
            factors.append(f"Elevated recent snooze frequency ({recent_snoozes} snoozes)")
        elif recent_snoozes > 0:
            risk_score += 10.0
            factors.append(f"Past snooze events detected ({recent_snoozes} snoozes)")

        # 4. Performance history failure/timeout rates
        if recent_perfs:
            total_attempts = len(recent_perfs)
            failed_count = sum(1 for p in recent_perfs if not p.is_correct or p.status in ('failed', 'timeout', 'snooze'))
            avg_time = sum(p.time_taken for p in recent_perfs) / total_attempts
            fail_rate = (failed_count / total_attempts) * 100.0

            if fail_rate > 40:
                risk_score += 20.0
                factors.append(f"High challenge failure rate ({fail_rate:.0f}%) in recent sessions")
            if avg_time > 45.0:
                risk_score += 15.0
                factors.append(f"Slow waking response time ({avg_time:.1f}s avg)")
            elif avg_time < 20.0:
                risk_score -= 10.0
                factors.append("Fast cognitive wake-up response (<20s avg)")
        else:
            factors.append("Initial baseline estimation (new account)")

        # Clamp risk score between 5.0 and 95.0
        risk_score = max(5.0, min(95.0, round(risk_score, 1)))

        # Categorize risk level
        if risk_score >= 65.0:
            oversleep_risk = "High"
            recommendation = "High risk of snoozing! Enable smart gradient alarm sound and use 'Math Problems' or 'Logic Puzzles' on Hard difficulty."
        elif risk_score >= 35.0:
            oversleep_risk = "Moderate"
            recommendation = "Moderate risk. Aim for 8 hours sleep and set a consistent bedtime reminder."
        else:
            oversleep_risk = "Low"
            recommendation = "Low oversleep risk! Circadian alignment is strong. Maintain current habit streak."

        return {
            "snooze_probability": risk_score,
            "oversleep_risk": oversleep_risk,
            "risk_score": risk_score,
            "factors": factors,
            "recommendation": recommendation,
            "streak": streak,
            "habit_score": habit_score
        }

    @staticmethod
    def get_personalized_challenge_ranking(user_id: int, db: Session) -> List[Dict[str, Any]]:
        """
        Task 2: Evaluate individual waking inertia clearance across all 7 challenge types
        and rank them from highest efficacy to lowest.
        """
        all_types = [
            "Math Problems",
            "Logic Puzzles",
            "Memory Challenges",
            "Word Games",
            "Pattern Recognition",
            "Riddles",
            "Quick Quizzes"
        ]

        perfs: List[ChallengePerformance] = (
            db.query(ChallengePerformance)
            .filter(ChallengePerformance.user_id == user_id)
            .all()
        )

        type_stats: Dict[str, Dict[str, Any]] = {
            t: {"type": t, "attempts": 0, "successes": 0, "total_accuracy": 0.0, "total_time": 0.0, "total_score": 0.0}
            for t in all_types
        }

        for p in perfs:
            t = p.challenge_type if p.challenge_type in type_stats else "Math Problems"
            type_stats[t]["attempts"] += 1
            if p.is_correct or p.status == "success":
                type_stats[t]["successes"] += 1
            type_stats[t]["total_accuracy"] += (p.accuracy or 0.0)
            type_stats[t]["total_time"] += (p.time_taken or 15.0)
            type_stats[t]["total_score"] += (p.score or 0.0)

        rankings = []
        for t, s in type_stats.items():
            attempts = s["attempts"]
            if attempts > 0:
                acc = round(s["total_accuracy"] / attempts, 1)
                avg_time = round(s["total_time"] / attempts, 1)
                win_rate = round((s["successes"] / attempts) * 100, 1)
                avg_score = round(s["total_score"] / attempts, 1)
                # Efficacy score: High accuracy + Fast speed + High win rate
                speed_score = max(10.0, 100.0 - (avg_time * 1.5))
                efficacy = round((acc * 0.4) + (win_rate * 0.3) + (speed_score * 0.3), 1)
            else:
                acc = 75.0
                avg_time = 20.0
                win_rate = 75.0
                avg_score = 50.0
                efficacy = 70.0  # baseline for unattempted

            rankings.append({
                "challenge_type": t,
                "attempts": attempts,
                "accuracy": acc,
                "avg_time": avg_time,
                "win_rate": win_rate,
                "avg_score": avg_score,
                "efficacy_score": efficacy
            })

        # Sort by highest efficacy score
        rankings.sort(key=lambda x: x["efficacy_score"], reverse=True)
        for idx, r in enumerate(rankings):
            r["rank"] = idx + 1

        return rankings

    @staticmethod
    def get_circadian_recommendations(user_id: int, db: Session) -> Dict[str, Any]:
        """
        Task 2: Advanced Personalization — compute optimal sleep & wake schedule,
        recommended challenge type, and adaptive difficulty.
        """
        user = db.query(User).filter(User.id == user_id).first()
        profile = user.profile if user else None

        target_wake = profile.wake_up_time if profile and profile.wake_up_time else "07:00"
        sleep_duration = profile.sleep_duration if profile and profile.sleep_duration else 8.0
        habit_score = profile.habit_score if profile else 50

        # Calculate optimal bedtime
        try:
            wh, wm = map(int, target_wake.split(":"))
            wake_mins = wh * 60 + wm
            sleep_mins = int(sleep_duration * 60)
            bedtime_mins = (wake_mins - sleep_mins) % 1440
            bh, bm = divmod(bedtime_mins, 60)
            optimal_bedtime = f"{bh:02d}:{bm:02d}"
            bedtime_reminder_time = f"{(bh if bm >= 30 else (bh - 1) % 24):02d}:{(bm - 30) % 60:02d}"
        except Exception:
            optimal_bedtime = "23:00"
            bedtime_reminder_time = "22:30"

        # Challenge rankings
        rankings = MLEngine.get_personalized_challenge_ranking(user_id, db)
        top_challenge = rankings[0]["challenge_type"] if rankings else "Math Problems"

        # Recommended difficulty based on habit score and top challenge accuracy
        top_acc = rankings[0]["accuracy"] if rankings else 75.0
        if habit_score >= 80 and top_acc >= 85:
            recommended_diff = "Hard"
        elif habit_score >= 50 and top_acc >= 65:
            recommended_diff = "Medium"
        else:
            recommended_diff = "Easy"

        # Risk assessment
        risk_info = MLEngine.predict_snooze_and_oversleep_risk(user_id, db)

        return {
            "target_wake_up": target_wake,
            "optimal_bedtime": optimal_bedtime,
            "bedtime_reminder_time": bedtime_reminder_time,
            "recommended_sleep_duration": sleep_duration,
            "recommended_challenge_type": top_challenge,
            "recommended_difficulty": recommended_diff,
            "snooze_probability": risk_info["snooze_probability"],
            "oversleep_risk": risk_info["oversleep_risk"],
            "top_challenge_efficacy": rankings[0]["efficacy_score"] if rankings else 75.0,
            "challenge_rankings": rankings,
            "ai_insights": [
                f"Your peak cognitive responsiveness is in '{top_challenge}' with {top_acc:.0f}% accuracy.",
                f"To maintain {sleep_duration} hours of restorative sleep for a {target_wake} wake-up, begin winding down by {bedtime_reminder_time}.",
                f"Current oversleep risk is {risk_info['oversleep_risk']} ({risk_info['snooze_probability']}% probability)."
            ]
        }

    # =========================================================================
    # 5. ADAPTIVE DIFFICULTY ENGINE CORE SUITE
    # =========================================================================

    DIFFICULTY_LEVELS = ["Beginner", "Easy", "Medium", "Hard", "Expert"]

    @staticmethod
    def analyze_user_performance(user_id: int, db: Session, challenge_type: Optional[str] = None) -> Dict[str, Any]:
        """
        1. User Performance Analysis:
        Calculates accuracy, response time, win rate, score momentum, and cognitive inertia.
        """
        query = db.query(ChallengePerformance).filter(ChallengePerformance.user_id == user_id)
        if challenge_type:
            query = query.filter(ChallengePerformance.challenge_type == challenge_type)
        
        perfs: List[ChallengePerformance] = query.order_by(ChallengePerformance.created_at.desc()).limit(20).all()
        
        if not perfs:
            return {
                "total_attempts": 0,
                "overall_accuracy": 75.0,
                "avg_response_time": 20.0,
                "success_rate": 75.0,
                "total_score": 0.0,
                "current_level": "Medium",
                "cognitive_speed_status": "Balanced",
                "mastery_score": 50.0
            }

        total_attempts = len(perfs)
        successes = sum(1 for p in perfs if p.is_correct or p.status == "success")
        total_accuracy = sum(p.accuracy or 0.0 for p in perfs)
        total_time = sum(p.time_taken or 15.0 for p in perfs)
        total_score = sum(p.score or 0.0 for p in perfs)
        
        overall_accuracy = round(total_accuracy / total_attempts, 1)
        avg_response_time = round(total_time / total_attempts, 1)
        success_rate = round((successes / total_attempts) * 100.0, 1)

        # Cognitive speed evaluation
        if avg_response_time <= 15.0:
            cognitive_speed_status = "Hyper-Fast"
        elif avg_response_time <= 30.0:
            cognitive_speed_status = "Fast & Alert"
        elif avg_response_time <= 50.0:
            cognitive_speed_status = "Moderate"
        else:
            cognitive_speed_status = "High Sleep Inertia"

        # Mastery score (0 - 100)
        time_factor = max(0.0, min(100.0, 100.0 - (avg_response_time * 1.5)))
        mastery_score = round((overall_accuracy * 0.45) + (success_rate * 0.35) + (time_factor * 0.20), 1)

        return {
            "total_attempts": total_attempts,
            "overall_accuracy": overall_accuracy,
            "avg_response_time": avg_response_time,
            "success_rate": success_rate,
            "total_score": round(total_score, 1),
            "cognitive_speed_status": cognitive_speed_status,
            "mastery_score": mastery_score
        }

    @classmethod
    def calculate_difficulty_adjustment(
        cls,
        user_id: int,
        challenge_type: str,
        current_difficulty: str,
        db: Session
    ) -> Dict[str, Any]:
        """
        2. Real-Time Difficulty Adjustment Engine:
        Dynamically ascends or descends across [Beginner, Easy, Medium, Hard, Expert]
        with high precision threshold evaluation.
        """
        levels = cls.DIFFICULTY_LEVELS
        curr_diff = current_difficulty.strip().capitalize() if current_difficulty else "Medium"
        if curr_diff not in levels:
            curr_diff = "Medium"
        curr_idx = levels.index(curr_diff)

        # Retrieve recent 5 sessions for this challenge type
        recent = (
            db.query(ChallengePerformance)
            .filter(ChallengePerformance.user_id == user_id, ChallengePerformance.challenge_type == challenge_type)
            .order_by(ChallengePerformance.created_at.desc())
            .limit(5)
            .all()
        )

        if not recent:
            recent = (
                db.query(ChallengePerformance)
                .filter(ChallengePerformance.user_id == user_id)
                .order_by(ChallengePerformance.created_at.desc())
                .limit(5)
                .all()
            )

        if not recent:
            return {
                "previous_difficulty": curr_diff,
                "adjusted_difficulty": curr_diff,
                "adjustment_action": "maintain",
                "reason": "Baseline difficulty established for new session."
            }

        total_recent = len(recent)
        succ = sum(1 for p in recent if p.is_correct or p.status == "success")
        acc = sum(p.accuracy for p in recent) / total_recent
        avg_t = sum(p.time_taken for p in recent) / total_recent
        fails = sum(p.failed_attempts for p in recent)

        new_idx = curr_idx
        action = "maintain"
        reason = f"Consistent performance maintained ({acc:.0f}% accuracy, {avg_t:.1f}s avg speed)."

        # Condition to Level UP: High accuracy (>=80%), low failed attempts (<=2), fast solving (<35s)
        if succ >= 2 and acc >= 80.0 and avg_t < 35.0 and fails <= 2:
            if curr_idx < len(levels) - 1:
                new_idx = curr_idx + 1
                action = "upgrade"
                reason = f"Excellent mastery detected ({acc:.0f}% accuracy, {avg_t:.1f}s speed)! Escalating challenge level to {levels[new_idx]}."
            else:
                action = "max_mastery"
                reason = "Already operating at peak Expert difficulty with outstanding accuracy!"

        # Condition to Level DOWN: Low accuracy (<60%), high solve time (>55s), or repeated failures
        elif succ <= 1 or acc < 60.0 or avg_t > 55.0 or fails >= 3:
            if curr_idx > 0:
                new_idx = curr_idx - 1
                action = "downgrade"
                reason = f"Detected high sleep inertia / lower accuracy ({acc:.0f}% accuracy, {avg_t:.1f}s speed). Temporarily scaling down to {levels[new_idx]}."
            else:
                action = "min_assistance"
                reason = "Maintaining Beginner difficulty with cognitive hints enabled."

        return {
            "previous_difficulty": curr_diff,
            "adjusted_difficulty": levels[new_idx],
            "adjustment_action": action,
            "reason": reason,
            "metrics": {
                "accuracy": round(acc, 1),
                "avg_time": round(avg_t, 1),
                "failed_attempts": fails,
                "success_count": succ
            }
        }

    @staticmethod
    def analyze_learning_patterns(user_id: int, db: Session) -> Dict[str, Any]:
        """
        3. Learning Pattern Analysis:
        Discovers temporal patterns, improvement trajectory, fatigue curves, and wakefulness peaks.
        """
        perfs = (
            db.query(ChallengePerformance)
            .filter(ChallengePerformance.user_id == user_id)
            .order_by(ChallengePerformance.created_at.asc())
            .all()
        )

        if len(perfs) < 3:
            return {
                "learning_curve_trend": "Calibrating",
                "accuracy_growth_pct": 0.0,
                "speed_improvement_pct": 0.0,
                "peak_performance_hour": "07:00",
                "retention_index": 75.0,
                "pattern_insights": ["Keep completing daily morning challenges to unlock your deep learning trajectory."]
            }

        # Compare first half vs second half
        mid = len(perfs) // 2
        early_batch = perfs[:mid]
        recent_batch = perfs[mid:]

        early_acc = sum(p.accuracy for p in early_batch) / len(early_batch)
        recent_acc = sum(p.accuracy for p in recent_batch) / len(recent_batch)
        acc_growth = round(recent_acc - early_acc, 1)

        early_speed = sum(p.time_taken for p in early_batch) / len(early_batch)
        recent_speed = sum(p.time_taken for p in recent_batch) / len(recent_batch)
        speed_delta = round(((early_speed - recent_speed) / max(1.0, early_speed)) * 100.0, 1)

        if acc_growth > 5.0 and speed_delta > 5.0:
            trend = "Rapidly Accelerating"
        elif acc_growth >= 0.0:
            trend = "Steady Growth"
        else:
            trend = "Plateau / Rest Required"

        retention_index = round(min(100.0, max(20.0, 60.0 + (acc_growth * 1.5) + (speed_delta * 0.5))), 1)

        pattern_insights = [
            f"Learning trajectory is '{trend}' with a {acc_growth:+.1f}% accuracy shift.",
            f"Waking reaction speed has improved by {speed_delta:+.1f}% across historical sessions.",
            f"Cognitive retention index is rated at {retention_index}/100."
        ]

        return {
            "learning_curve_trend": trend,
            "accuracy_growth_pct": acc_growth,
            "speed_improvement_pct": speed_delta,
            "retention_index": retention_index,
            "pattern_insights": pattern_insights
        }

    @classmethod
    def optimize_engagement(cls, user_id: int, db: Session) -> Dict[str, Any]:
        """
        4 & 5. Challenge Personalization & Engagement Optimization:
        Synthesizes performance, learning patterns, habit score, and snooze risk
        to prescribe the ultimate personalized wake-up protocol.
        """
        perf_summary = cls.analyze_user_performance(user_id, db)
        learning = cls.analyze_learning_patterns(user_id, db)
        rankings = cls.get_personalized_challenge_ranking(user_id, db)
        circadian = cls.get_circadian_recommendations(user_id, db)
        
        user = db.query(User).filter(User.id == user_id).first()
        profile = user.profile if user else None
        streak = profile.streak if profile else 0
        habit_score = profile.habit_score if profile else 50

        top_challenge = rankings[0]["challenge_type"] if rankings else "Math Problems"
        raw_diff = getattr(profile, "difficulty_level", None) if profile else None
        curr_diff = raw_diff.capitalize() if raw_diff else "Medium"
        diff_adj = cls.calculate_difficulty_adjustment(user_id, top_challenge, curr_diff, db)

        # Engagement incentive recommendations
        milestone_next = ((streak // 5) + 1) * 5
        streak_gap = max(1, milestone_next - streak)

        engagement_score = round(
            (habit_score * 0.4) + (perf_summary["mastery_score"] * 0.4) + (min(100, streak * 10) * 0.2),
            1
        )

        return {
            "engagement_score": engagement_score,
            "habit_score": habit_score,
            "streak": streak,
            "next_milestone_days": streak_gap,
            "recommended_challenge": top_challenge,
            "adaptive_difficulty": diff_adj["adjusted_difficulty"],
            "difficulty_action": diff_adj["adjustment_action"],
            "difficulty_reason": diff_adj["reason"],
            "performance_metrics": perf_summary,
            "learning_patterns": learning,
            "optimal_bedtime": circadian["optimal_bedtime"],
            "optimal_wake_up": circadian["target_wake_up"],
            "snooze_probability": circadian["snooze_probability"],
            "challenge_rankings": rankings,
            "optimization_actions": [
                f"Engage with '{top_challenge}' on '{diff_adj['adjusted_difficulty']}' difficulty for optimal waking inertia clearance.",
                f"Maintain {streak}-day streak ({streak_gap} days until {milestone_next}-day milestone trophy).",
                f"Bedtime window is synchronized at {circadian['optimal_bedtime']} for peak cognitive recovery."
            ]
        }

