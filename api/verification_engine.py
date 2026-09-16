"""
Wake-Up Verification Engine for Intelligent Cognitive Alarm Platform
Provides:
1. Multi-method verification suite:
   - Puzzle Completion
   - Multi-Step Challenges (2-3 chained cognitive stages)
   - Consecutive Correct Answers (N correct streak verification)
   - Time-Based Challenges (countdown speed & precision checks)
   - Cognitive Accuracy Checks (reaction latency & wakefulness assessment)
2. Wakefulness Assessment (1-10 index & circadian alertness classification)
3. Alarm Dismissal Validation
4. Anti-Snooze Workflows (snooze caps, escalating challenge difficulty, penalty logic)
5. Wake-Up Confirmation Tracking (post-dismissal check-ins & relapse prevention)
"""

import datetime
import random
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from database import User, UserProfile, Alarm, ChallengePerformance, WakeUpConfirmation, WakeLog, Notification, ActivityLog
from challenge_generator import generate_cognitive_challenge, verify_challenge_answer


class VerificationMethod:
    PUZZLE = "Puzzle Completion"
    MULTI_STEP = "Multi-Step Challenges"
    CONSECUTIVE = "Consecutive Correct Answers"
    TIME_BASED = "Time-Based Challenges"
    COGNITIVE_ACCURACY = "Cognitive Accuracy Checks"

    ALL = [PUZZLE, MULTI_STEP, CONSECUTIVE, TIME_BASED, COGNITIVE_ACCURACY]


class WakeUpVerificationEngine:
    """Core verification and wakefulness engine."""

    # -------------------------------------------------------------------------
    # 1. Challenge Generation by Verification Method
    # -------------------------------------------------------------------------

    @staticmethod
    def generate_verification_challenge(
        verification_method: str = VerificationMethod.PUZZLE,
        difficulty: str = "Medium",
        step_index: int = 1,
        total_steps: int = 1,
        consecutive_streak: int = 0,
        consecutive_target: int = 3,
        time_limit_sec: int = 30,
        preferred_type: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Generates tailored challenge structures according to verification method.
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

        if verification_method == VerificationMethod.MULTI_STEP:
            # Pick different challenge types for each step in multi-step
            step_types = ["Math Problems", "Word Games", "Logic Puzzles", "Pattern Recognition", "Riddles"]
            selected_type = step_types[(step_index - 1) % len(step_types)]
            challenge = generate_cognitive_challenge(challenge_type=selected_type, difficulty=difficulty)
            challenge["verification_method"] = VerificationMethod.MULTI_STEP
            challenge["step_index"] = step_index
            challenge["total_steps"] = max(1, total_steps)
            challenge["is_final_step"] = (step_index >= challenge["total_steps"])
            challenge["instructions"] = f"Step {step_index} of {challenge['total_steps']}: Solve this challenge to proceed to the next step!"
            challenge["time_limit_sec"] = time_limit_sec
            return challenge

        elif verification_method == VerificationMethod.CONSECUTIVE:
            # Rapid-fire problems
            selected_type = preferred_type if preferred_type in all_types else random.choice(["Math Problems", "Quick Quizzes", "Word Games"])
            challenge = generate_cognitive_challenge(challenge_type=selected_type, difficulty=difficulty)
            challenge["verification_method"] = VerificationMethod.CONSECUTIVE
            challenge["consecutive_streak"] = consecutive_streak
            challenge["consecutive_target"] = max(1, consecutive_target)
            challenge["remaining_needed"] = max(0, challenge["consecutive_target"] - consecutive_streak)
            challenge["instructions"] = f"Consecutive Challenge: {consecutive_streak}/{challenge['consecutive_target']} solved correctly! A single error resets your streak."
            challenge["time_limit_sec"] = min(25, time_limit_sec)
            return challenge

        elif verification_method == VerificationMethod.TIME_BASED:
            selected_type = preferred_type if preferred_type in all_types else random.choice(["Math Problems", "Pattern Recognition", "Quick Quizzes"])
            challenge = generate_cognitive_challenge(challenge_type=selected_type, difficulty=difficulty)
            challenge["verification_method"] = VerificationMethod.TIME_BASED
            challenge["time_limit_sec"] = max(10, min(60, time_limit_sec))
            challenge["instructions"] = f"Time-Critical Challenge: Solve before the {time_limit_sec}s timer runs out to disarm the alarm!"
            return challenge

        elif verification_method == VerificationMethod.COGNITIVE_ACCURACY:
            selected_type = preferred_type if preferred_type in all_types else random.choice(["Logic Puzzles", "Pattern Recognition", "Memory Challenges"])
            challenge = generate_cognitive_challenge(challenge_type=selected_type, difficulty=difficulty)
            challenge["verification_method"] = VerificationMethod.COGNITIVE_ACCURACY
            challenge["requires_accuracy_check"] = True
            challenge["min_accuracy_threshold"] = 75.0
            challenge["instructions"] = "Cognitive Accuracy Verification: Precision is required to assess sleep inertia clearance."
            challenge["time_limit_sec"] = time_limit_sec
            return challenge

        else:  # Standard Puzzle Completion
            selected_type = preferred_type if preferred_type in all_types else "Math Problems"
            challenge = generate_cognitive_challenge(challenge_type=selected_type, difficulty=difficulty)
            challenge["verification_method"] = VerificationMethod.PUZZLE
            challenge["step_index"] = step_index
            challenge["total_steps"] = total_steps
            challenge["instructions"] = "Solve the cognitive puzzle to verify wakefulness and dismiss the alarm."
            challenge["time_limit_sec"] = time_limit_sec
            return challenge

    # -------------------------------------------------------------------------
    # 2. Wakefulness Assessment
    # -------------------------------------------------------------------------

    @staticmethod
    def assess_wakefulness(
        accuracy: float,
        time_taken: float,
        failed_attempts: int,
        verification_method: str = VerificationMethod.PUZZLE,
        user_self_rating: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Evaluates user cognitive alertness and assigns a wakefulness score (1.0 to 10.0).
        """
        # Baseline score
        base = 8.0

        # Accuracy adjustment
        if accuracy >= 95.0:
            base += 1.5
        elif accuracy >= 80.0:
            base += 0.8
        elif accuracy < 60.0:
            base -= 2.0
        elif accuracy < 40.0:
            base -= 3.5

        # Speed / latency factor
        if time_taken <= 12.0:
            base += 1.0
        elif time_taken <= 25.0:
            base += 0.4
        elif time_taken > 60.0:
            base -= 1.8
        elif time_taken > 45.0:
            base -= 1.0

        # Failed attempts penalty
        base -= (failed_attempts * 0.8)

        # Self-rating blend if provided
        if user_self_rating is not None:
            user_val = max(1.0, min(10.0, float(user_self_rating)))
            final_score = round((base * 0.65) + (user_val * 0.35), 1)
        else:
            final_score = round(base, 1)

        final_score = max(1.0, min(10.0, final_score))

        # Status categorization
        if final_score >= 8.5:
            status = "fully_awake"
            status_label = "Fully Awake & Peak Alertness"
            description = "Sleep inertia is completely cleared. You are ready for peak morning productivity."
        elif final_score >= 6.8:
            status = "mild_inertia"
            status_label = "Mild Sleep Inertia"
            description = "Cognitive faculties are engaging well. A glass of water and sunlight will elevate alertness."
        elif final_score >= 5.0:
            status = "groggy"
            status_label = "Moderate Grogginess"
            description = "Moderate sleep inertia detected. Avoid immediate complex decisions."
        else:
            status = "severe_inertia"
            status_label = "Severe Inertia / Relapse Risk"
            description = "High probability of falling back asleep. Complete post-wake confirmation check-in."

        return {
            "wakefulness_score": final_score,
            "status": status,
            "status_label": status_label,
            "description": description,
            "metrics": {
                "accuracy": round(accuracy, 1),
                "time_taken_sec": round(time_taken, 1),
                "failed_attempts": failed_attempts,
                "verification_method": verification_method
            }
        }

    # -------------------------------------------------------------------------
    # 3. Alarm Dismissal Validation & Submission
    # -------------------------------------------------------------------------

    @classmethod
    def validate_and_dismiss_alarm(
        cls,
        user_id: int,
        db: Session,
        alarm_id: Optional[int],
        expected_answer: str,
        user_answer: str,
        time_taken: float,
        failed_attempts: int,
        verification_method: str = VerificationMethod.PUZZLE,
        challenge_type: str = "Math Problems",
        difficulty: str = "Medium",
        step_index: int = 1,
        total_steps: int = 1,
        consecutive_streak: int = 0,
        consecutive_target: int = 3,
        time_limit_exceeded: bool = False,
        self_wakefulness_rating: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Validates challenge completion for all verification methods, manages
        anti-snooze rules, updates user habit scores, and determines if alarm can be dismissed.
        """
        user = db.query(User).filter(User.id == user_id).first()
        profile = user.profile if user else None
        if not profile and user:
            profile = UserProfile(user_id=user.id)
            db.add(profile)

        alarm = db.query(Alarm).filter(Alarm.id == alarm_id, Alarm.user_id == user_id).first() if alarm_id else None

        # Verify answer
        is_answer_correct = verify_challenge_answer(expected_answer, user_answer)

        # Check time limit
        if time_limit_exceeded:
            is_valid = False
            completion_status = "timeout"
        elif is_answer_correct:
            is_valid = True
            completion_status = "success"
        else:
            is_valid = False
            completion_status = "failed"

        # Calculate accuracy
        accuracy = round((1.0 / (failed_attempts + 1)) * 100.0, 1) if is_valid else 0.0

        # Assess wakefulness
        wake_assessment = cls.assess_wakefulness(
            accuracy=accuracy,
            time_taken=time_taken,
            failed_attempts=failed_attempts,
            verification_method=verification_method,
            user_self_rating=self_wakefulness_rating
        )

        # Multi-Step, Consecutive & Adaptive Compensation Logic
        can_dismiss_alarm = False
        next_step_required = False
        next_step_info = None
        compensation_added = False
        current_total_steps = total_steps

        # Feature 1: Adaptive Compensation Scale
        # If user gets a question wrong, add +1 compensation question to ensure cognitive wakefulness
        if not is_valid:
            compensation_added = True
            current_total_steps = total_steps + 1
            next_step_required = True
            
            # Dynamically adapt challenge
            adaptive_diff = difficulty
            if failed_attempts >= 2 and difficulty in ("Hard", "Expert"):
                adaptive_diff = "Medium" # Step back to calibrate
            elif failed_attempts == 1 and difficulty in ("Easy", "Beginner"):
                adaptive_diff = "Medium" # Step up to engage prefrontal cortex

            next_step_info = cls.generate_verification_challenge(
                verification_method=verification_method,
                difficulty=adaptive_diff,
                step_index=step_index,
                total_steps=current_total_steps,
                consecutive_streak=0,
                consecutive_target=consecutive_target
            )
            next_step_info["instructions"] = f"Incorrect answer! +1 compensation question added. (Question {step_index} of {current_total_steps})"

        elif verification_method == VerificationMethod.MULTI_STEP:
            if step_index >= current_total_steps:
                can_dismiss_alarm = True
            else:
                next_step_required = True
                next_step_index = step_index + 1
                next_step_info = cls.generate_verification_challenge(
                    verification_method=VerificationMethod.MULTI_STEP,
                    difficulty=difficulty,
                    step_index=next_step_index,
                    total_steps=current_total_steps
                )

        elif verification_method == VerificationMethod.CONSECUTIVE:
            new_streak = consecutive_streak + 1
            if new_streak >= consecutive_target:
                can_dismiss_alarm = True
            else:
                next_step_required = True
                next_step_info = cls.generate_verification_challenge(
                    verification_method=VerificationMethod.CONSECUTIVE,
                    difficulty=difficulty,
                    consecutive_streak=new_streak,
                    consecutive_target=consecutive_target
                )

        elif verification_method == VerificationMethod.COGNITIVE_ACCURACY:
            if wake_assessment["wakefulness_score"] >= 6.0:
                can_dismiss_alarm = True
            else:
                can_dismiss_alarm = False
                next_step_required = True
                next_step_info = cls.generate_verification_challenge(
                    verification_method=VerificationMethod.COGNITIVE_ACCURACY,
                    difficulty=difficulty
                )
                next_step_info["instructions"] = f"Waking inertia detected ({wake_assessment['status_label']}). Complete 1 more puzzle to guarantee full cognitive awakening."

        else:  # Standard Puzzle Completion or Time-Based
            can_dismiss_alarm = is_valid

        # Calculate Score
        base_scores = {"Beginner": 30, "Easy": 50, "Medium": 100, "Hard": 150, "Expert": 200}
        base_score = base_scores.get(difficulty.capitalize(), 100)
        time_multiplier = max(0.5, 1.0 - (time_taken / 120.0))
        calculated_score = round(base_score * (accuracy / 100.0) * time_multiplier, 1) if is_valid else 0.0

        # Record Challenge Performance in DB
        perf = ChallengePerformance(
            user_id=user_id,
            alarm_id=alarm_id,
            challenge_type=challenge_type,
            difficulty=difficulty,
            accuracy=accuracy,
            time_taken=time_taken,
            failed_attempts=failed_attempts,
            status=completion_status,
            score=calculated_score,
            is_correct=is_valid,
            verification_method=verification_method,
            step_index=step_index,
            total_steps=current_total_steps,
            consecutive_count=consecutive_streak + (1 if is_valid else 0),
            wakefulness_score=wake_assessment["wakefulness_score"]
        )
        db.add(perf)

        # If alarm successfully dismissed:
        if can_dismiss_alarm:
            if alarm:
                alarm.snooze_count = 0
                if alarm.alarm_type == "One-Time":
                    alarm.alarm_status = False

            if profile:
                profile.streak += 1
                profile.habit_score = min(100, profile.habit_score + 3)

            # Record WakeLog
            now_str = datetime.datetime.now().strftime("%H:%M")
            sched_time = alarm.alarm_time if alarm else now_str
            wake_log = WakeLog(
                user_id=user_id,
                alarm_id=alarm_id,
                scheduled_time=sched_time,
                actual_wake_time=now_str,
                drift_minutes=0.0,
                snooze_count=alarm.snooze_count if alarm else 0,
                dismissal_status="verified_dismissal",
                wakefulness_rating=wake_assessment["wakefulness_score"]
            )
            db.add(wake_log)

            # Create Wake-Up Confirmation Check-in
            confirmation = WakeUpConfirmation(
                user_id=user_id,
                alarm_id=alarm_id,
                wakefulness_score=wake_assessment["wakefulness_score"],
                assessment_status=wake_assessment["status"],
                verification_method=verification_method,
                notes=f"Dismissed via {verification_method} with {accuracy:.0f}% accuracy in {time_taken:.1f}s"
            )
            db.add(confirmation)

            # Schedule/Send post-wake confirmation notification
            notif = Notification(
                user_id=user_id,
                title="☀️ Wake-Up Verified!",
                message=f"Alarm disarmed via {verification_method}! Wakefulness: {wake_assessment['status_label']}. Streak: {profile.streak if profile else 1} days.",
                type="verification"
            )
            db.add(notif)

            db.add(ActivityLog(
                user_id=user_id,
                action="Alarm Dismissed",
                details=f"Disarmed via {verification_method} ({accuracy:.0f}% accuracy, {time_taken:.1f}s)"
            ))

        db.commit()

        return {
            "success": is_valid,
            "can_dismiss_alarm": can_dismiss_alarm,
            "next_step_required": next_step_required,
            "next_step": next_step_info,
            "wake_assessment": wake_assessment,
            "score": calculated_score,
            "accuracy": accuracy,
            "time_taken": time_taken,
            "failed_attempts": failed_attempts,
            "message": "Alarm disarmed successfully! Great morning!" if can_dismiss_alarm else ("Next verification step ready" if next_step_required else "Verification failed. Try again.")
        }

    # -------------------------------------------------------------------------
    # 4. Anti-Snooze Workflows
    # -------------------------------------------------------------------------

    @staticmethod
    def process_snooze_request(
        user_id: int,
        alarm_id: Optional[int],
        db: Session,
        questions_solved: bool = True
    ) -> Dict[str, Any]:
        """
        Anti-Snooze Workflow Manager:
        1. Checks snooze restriction: Snooze is locked while required questions remain unsolved.
        2. Checks snooze limits (blocks snooze if limit exceeded).
        3. Applies escalating difficulty penalties for repeated snoozes.
        4. Reduces habit score on excessive snoozing.
        5. Issues anti-snooze alert.
        """
        if not questions_solved:
            return {
                "allowed": False,
                "reason": "Snooze is restricted! You must solve all required cognitive questions before snooze becomes available.",
                "snooze_count": 0,
                "snooze_locked": True
            }

        user = db.query(User).filter(User.id == user_id).first()
        alarm = db.query(Alarm).filter(Alarm.id == alarm_id, Alarm.user_id == user_id).first() if alarm_id else None

        if not alarm:
            # Look for active alarm
            alarm = db.query(Alarm).filter(Alarm.user_id == user_id, Alarm.alarm_status == True).first()

        if not alarm:
            return {"allowed": False, "reason": "Alarm not found", "snooze_count": 0}

        snooze_limit = alarm.snooze_limit or 3
        current_snoozes = alarm.snooze_count or 0

        # Check if snooze limit reached
        if current_snoozes >= snooze_limit:
            return {
                "allowed": False,
                "snooze_count": current_snoozes,
                "snooze_limit": snooze_limit,
                "reason": f"Anti-Snooze Cap Reached! You have reached your maximum of {snooze_limit} snoozes. You must solve the wake-up verification challenge to disarm the alarm.",
                "escalated_difficulty": "Expert",
                "escalated_verification": VerificationMethod.MULTI_STEP
            }

        # Increment snooze count
        alarm.snooze_count += 1
        new_count = alarm.snooze_count

        # Escalating difficulty calculation
        if new_count == 1:
            next_diff = "Medium"
            penalty_msg = "First snooze used (1/3). Next challenge difficulty: Medium."
        elif new_count == 2:
            next_diff = "Hard"
            penalty_msg = "Second snooze used (2/3). Challenge upgraded to Hard Multi-Step."
        else:
            next_diff = "Expert"
            penalty_msg = "Final snooze used! Escalating to Expert Consecutive Challenge."

        alarm.difficulty_level = next_diff

        # Penalize habit score
        profile = user.profile if user else None
        if profile:
            profile.habit_score = max(0, profile.habit_score - 2)
            profile.snooze_reduction_score = max(0.0, (profile.snooze_reduction_score or 80.0) - 5.0)

        # Log snooze activity
        db.add(ActivityLog(
            user_id=user_id,
            action="Snooze Alarm",
            details=f"Snoozed '{alarm.alarm_name}' ({new_count}/{snooze_limit} snoozes). Next difficulty: {next_diff}"
        ))

        # In-app notification
        db.add(Notification(
            user_id=user_id,
            title="⏰ Anti-Snooze Warning",
            message=f"Alarm snoozed ({new_count}/{snooze_limit}). Challenge difficulty escalated to {next_diff}.",
            type="alarm"
        ))

        db.commit()

        return {
            "allowed": True,
            "snooze_count": new_count,
            "snooze_limit": snooze_limit,
            "remaining_snoozes": max(0, snooze_limit - new_count),
            "escalated_difficulty": next_diff,
            "message": penalty_msg
        }

    # -------------------------------------------------------------------------
    # 5. Wake-Up Confirmation Tracking (Post-Dismissal)
    # -------------------------------------------------------------------------

    @staticmethod
    def submit_post_wake_confirmation(
        user_id: int,
        alarm_id: Optional[int],
        wakefulness_rating: float = 5.0,
        notes: Optional[str] = None,
        confirmed: bool = True,
        wakefulness_level: Optional[str] = None,
        response_time_sec: float = 0.0,
        db: Optional[Session] = None
    ) -> Dict[str, Any]:
        """
        Handles unified post-alarm check-in:
        1. 'Are you awake?' (Yes / No).
        2. 3-level wakefulness scale: 'Slightly awake', 'Half awake', 'Fully awake' (or 1-5 rating).
        3. Records confirmation into database for progress reports.
        """
        if db is None:
            return {"success": False, "detail": "Database session required"}

        user = db.query(User).filter(User.id == user_id).first()
        profile = user.profile if user else None

        # Level mapping
        level = wakefulness_level or "Fully awake"
        if not confirmed:
            level = "Not awake / Drowsy"
            rating = 1.0
            score_10 = 2.5
            status = "unconfirmed_drowsy"
            habit_bonus = 0
        elif level == "Slightly awake" or wakefulness_rating <= 2.0:
            level = "Slightly awake"
            rating = min(2.0, max(1.0, float(wakefulness_rating)))
            score_10 = 5.5
            status = "slightly_awake"
            habit_bonus = 1
        elif level == "Half awake" or wakefulness_rating == 3.0:
            level = "Half awake"
            rating = 3.0
            score_10 = 7.5
            status = "half_awake"
            habit_bonus = 2
        else: # Fully awake
            level = "Fully awake"
            rating = min(5.0, max(4.0, float(wakefulness_rating)))
            score_10 = 9.5
            status = "fully_awake"
            habit_bonus = 3

        # Record confirmation
        conf = WakeUpConfirmation(
            user_id=user_id,
            alarm_id=alarm_id,
            confirmed=confirmed,
            wakefulness_level=level,
            wakefulness_rating=rating,
            wakefulness_score=score_10,
            assessment_status=status,
            verification_method="Wake-Up Confirmation Check-In",
            response_time_sec=response_time_sec,
            notes=notes or f"Confirmed: {'Yes' if confirmed else 'No'} | Level: {level} ({rating}/5)"
        )
        db.add(conf)

        if profile and confirmed:
            profile.habit_score = min(100, profile.habit_score + habit_bonus)
            profile.wake_up_consistency_score = min(100.0, (profile.wake_up_consistency_score or 70.0) + 2.0)

        db.add(ActivityLog(
            user_id=user_id,
            action="Wake-Up Confirmation",
            details=f"Confirmed awake: {'Yes' if confirmed else 'No'} | Alertness: {level} ({rating}/5)"
        ))

        db.commit()

        return {
            "success": True,
            "confirmed": confirmed,
            "wakefulness_level": level,
            "wakefulness_rating": rating,
            "wakefulness_score": score_10,
            "assessment_status": status,
            "streak_bonus_points": habit_bonus,
            "habit_score": profile.habit_score if profile else 50,
            "message": f"Wake-up confirmation recorded! Alertness level: {level} ({rating}/5)."
        }
