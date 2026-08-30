import unittest
from unittest.mock import patch
from types import SimpleNamespace
from datetime import datetime

from services.verification_service import (
    VERIFICATION_METHODS,
    init_verification_session,
    process_verification_step,
    get_verification_session,
    remove_verification_session
)
from schemas import (
    AlarmBase,
    AlarmCreate,
    AlarmUpdate,
    AlarmResponse,
    VerificationStartRequest,
    VerificationStepRequest,
    VerificationStepResponse,
    ChallengeValidateRequest,
    ChallengeValidateResponse
)


class MockDB:
    def __init__(self):
        self.added = []
        self.committed = False

    def add(self, obj):
        self.added.append(obj)

    def commit(self):
        self.committed = True

    def refresh(self, obj):
        pass

    def rollback(self):
        pass


def mock_generate_challenge(challenge_type="Math Problems", difficulty="Medium"):
    return {
        "id": "chal_mock_123",
        "type": challenge_type,
        "difficulty": difficulty,
        "question": "What is 2 + 2?",
        "options": ["3", "4", "5", "6"],
        "answer": "4",
        "explanation": "2 + 2 = 4",
        "time_limit": 20
    }


class WakeUpVerificationRulesTests(unittest.TestCase):
    """
    Unit tests for the 5 Wake-Up Verification Methods:
    1. Puzzle Completion
    2. Multi-Step Challenge
    3. Consecutive Correct Answers
    4. Time-Based Verification
    5. Cognitive Accuracy Check
    """

    def setUp(self):
        self.db = MockDB()
        self.patcher = patch("services.verification_service.generate_cognitive_challenge", side_effect=mock_generate_challenge)
        self.mock_gen = self.patcher.start()

    def tearDown(self):
        self.patcher.stop()

    def test_verification_methods_list(self):
        """Validates that all 5 verification methods are registered."""
        method_ids = [m["id"] for m in VERIFICATION_METHODS]
        self.assertIn("puzzle_completion", method_ids)
        self.assertIn("multi_step", method_ids)
        self.assertIn("consecutive_correct", method_ids)
        self.assertIn("time_based", method_ids)
        self.assertIn("accuracy_check", method_ids)

    def test_scheduler_challenge_is_reused_for_first_step_and_duplicate_start(self):
        first_challenge = {
            "id": "chal_scheduler_1",
            "type": "Math Problems",
            "difficulty": "Medium",
            "question": "Scheduler question",
            "answer": "7",
            "explanation": "Scheduler answer",
            "source": "scheduler",
            "scheduler_generated": True
        }
        first = init_verification_session(
            alarm_id=42,
            user_id=9,
            verification_method="multi_step",
            verification_steps=3,
            first_challenge=first_challenge
        )
        duplicate = init_verification_session(
            alarm_id=42,
            user_id=9,
            verification_method="multi_step",
            verification_steps=3,
            first_challenge={"id": "should_not_replace"}
        )

        self.assertEqual(first["session_id"], duplicate["session_id"])
        self.assertEqual(duplicate["current_challenge"]["id"], "chal_scheduler_1")
        self.assertEqual(duplicate["current_challenge"]["source"], "scheduler")

    def test_identified_step_replay_returns_same_challenge_without_processing_twice(self):
        session = init_verification_session(
            verification_method="multi_step",
            verification_steps=3,
            first_challenge={
                "id": "chal_step_1",
                "type": "Math Problems",
                "difficulty": "Medium",
                "question": "Q1",
                "answer": "10"
            }
        )
        request = {
            "session_id": session["session_id"],
            "user_answer": "10",
            "time_taken": 2,
            "is_timeout": False,
            "step_number": 1,
            "challenge_id": "chal_step_1"
        }
        first = process_verification_step(db=self.db, **request)
        generated_count = self.mock_gen.call_count
        replay = process_verification_step(db=self.db, **request)

        self.assertEqual(replay, first)
        self.assertEqual(self.mock_gen.call_count, generated_count)
        self.assertEqual(len(self.db.added), 1)
        self.assertEqual(first["next_challenge"]["id"], replay["next_challenge"]["id"])

    def test_method_1_puzzle_completion_success(self):
        """Method 1: Puzzle Completion passes immediately upon 1 correct answer."""
        first_chal = {
            "id": "chal_test_1",
            "type": "Math Problems",
            "difficulty": "Medium",
            "question": "What is 15 + 28?",
            "answer": "43",
            "explanation": "15 + 28 = 43"
        }
        session = init_verification_session(
            verification_method="puzzle_completion",
            first_challenge=first_chal
        )
        session_id = session["session_id"]

        result = process_verification_step(
            session_id=session_id,
            user_answer="43",
            time_taken=6.0,
            is_timeout=False,
            db=self.db
        )

        self.assertTrue(result["is_step_correct"])
        self.assertEqual(result["verification_status"], "passed")
        self.assertEqual(result["correct_count"], 1)
        self.assertEqual(result["total_steps"], 1)
        # Attempt must be logged in database
        self.assertEqual(len(self.db.added), 1)
        self.assertTrue(self.db.added[0].is_correct)
        self.assertEqual(self.db.added[0].verification_status, "passed")

    def test_method_1_puzzle_completion_failure_and_retry(self):
        """Method 1: Wrong answer fails step, keeps session active, steps down difficulty."""
        first_chal = {
            "id": "chal_test_fail",
            "type": "Math Problems",
            "difficulty": "Hard",
            "question": "What is 12 * 12?",
            "answer": "144",
            "explanation": "12 * 12 = 144"
        }
        session = init_verification_session(
            verification_method="puzzle_completion",
            first_challenge=first_chal
        )
        session_id = session["session_id"]

        result = process_verification_step(
            session_id=session_id,
            user_answer="100", # Wrong
            time_taken=8.0,
            is_timeout=False,
            db=self.db
        )

        self.assertFalse(result["is_step_correct"])
        self.assertEqual(result["verification_status"], "failed")
        self.assertIsNotNone(result["next_challenge"])
        self.assertEqual(len(self.db.added), 1)
        self.assertFalse(self.db.added[0].is_correct)

    def test_method_2_multi_step_challenge_progression(self):
        """Method 2: Multi-Step requires sequential questions (e.g. 3 steps)."""
        session = init_verification_session(
            verification_method="multi_step",
            verification_steps=3,
            first_challenge={"answer": "10", "type": "Math Problems", "difficulty": "Medium", "question": "Q1"}
        )
        session_id = session["session_id"]
        self.assertEqual(session["total_steps"], 3)
        self.assertEqual(session["current_step"], 1)
        first_challenge_id = session["current_challenge"].get("id")

        # Step 1: Correct
        res1 = process_verification_step(session_id, "10", 5.0, False, self.db)
        self.assertEqual(res1["verification_status"], "in_progress")
        self.assertEqual(res1["current_step"], 2)
        self.assertEqual(res1["correct_count"], 1)
        self.assertIsNotNone(res1["next_challenge"])
        step_2_challenge_id = res1["next_challenge"]["id"]
        self.assertNotEqual(step_2_challenge_id, first_challenge_id)

        # Update next question answer to '20' for testing step 2
        active_sess = get_verification_session(session_id)
        active_sess["current_challenge"]["answer"] = "20"

        # Step 2: Correct
        res2 = process_verification_step(session_id, "20", 4.0, False, self.db)
        self.assertEqual(res2["verification_status"], "in_progress")
        self.assertEqual(res2["current_step"], 3)
        self.assertEqual(res2["correct_count"], 2)
        self.assertNotEqual(res2["next_challenge"]["id"], step_2_challenge_id)

        # Update next question answer to '30' for testing step 3
        active_sess = get_verification_session(session_id)
        active_sess["current_challenge"]["answer"] = "30"

        # Step 3: Correct (Final step)
        res3 = process_verification_step(session_id, "30", 5.0, False, self.db)
        self.assertEqual(res3["verification_status"], "passed")
        self.assertEqual(res3["correct_count"], 3)
        self.assertEqual(res3["total_steps"], 3)

    def test_method_3_consecutive_correct_streak_reset_on_failure(self):
        """Method 3: Consecutive correct answers reset to 0 on wrong answer."""
        session = init_verification_session(
            verification_method="consecutive_correct",
            consecutive_required=2,
            first_challenge={"answer": "42", "type": "Logic Puzzles", "difficulty": "Medium", "question": "Q1"}
        )
        session_id = session["session_id"]
        self.assertEqual(session["consecutive_required"], 2)

        # Step 1: Correct (Streak: 1/2)
        res1 = process_verification_step(session_id, "42", 5.0, False, self.db)
        self.assertEqual(res1["consecutive_correct"], 1)
        self.assertEqual(res1["verification_status"], "in_progress")

        # Step 2: Incorrect (Streak resets to 0/2!)
        active_sess = get_verification_session(session_id)
        active_sess["current_challenge"]["answer"] = "99"
        res2 = process_verification_step(session_id, "wrong_answer", 6.0, False, self.db)
        self.assertEqual(res2["consecutive_correct"], 0) # Counter reset!
        self.assertEqual(res2["verification_status"], "failed")

        # Step 3: Correct (Streak restarts: 1/2)
        active_sess = get_verification_session(session_id)
        active_sess["current_challenge"]["answer"] = "alpha"
        res3 = process_verification_step(session_id, "alpha", 4.0, False, self.db)
        self.assertEqual(res3["consecutive_correct"], 1)
        self.assertEqual(res3["verification_status"], "in_progress")

        # Step 4: Correct (Streak reaches 2/2 -> Passed!)
        active_sess = get_verification_session(session_id)
        active_sess["current_challenge"]["answer"] = "beta"
        res4 = process_verification_step(session_id, "beta", 3.0, False, self.db)
        self.assertEqual(res4["consecutive_correct"], 2)
        self.assertEqual(res4["verification_status"], "passed")

    def test_method_4_time_based_verification_timeout(self):
        """Method 4: Exceeding time limit marks attempt as timed out, resets streak, logs attempt."""
        session = init_verification_session(
            verification_method="time_based",
            time_limit=15,
            first_challenge={"answer": "7", "type": "Math Problems", "difficulty": "Medium", "question": "Q1"}
        )
        session_id = session["session_id"]

        # Timeout occurs
        result = process_verification_step(
            session_id=session_id,
            user_answer="",
            time_taken=15.0,
            is_timeout=True,
            db=self.db
        )

        self.assertFalse(result["is_step_correct"])
        self.assertEqual(result["verification_status"], "timeout")
        self.assertEqual(result["consecutive_correct"], 0)
        # Check DB log
        self.assertEqual(len(self.db.added), 1)
        self.assertFalse(self.db.added[0].is_correct)
        self.assertEqual(self.db.added[0].verification_status, "timeout")
        self.assertEqual(self.db.added[0].time_taken, 15)

    def test_method_5_cognitive_accuracy_check_threshold(self):
        """Method 5: Accuracy check requires min accuracy (e.g. 2/3 = 67%)."""
        session = init_verification_session(
            verification_method="accuracy_check",
            verification_steps=3,
            required_accuracy=67,
            first_challenge={"answer": "A", "type": "Quick Quizzes", "difficulty": "Medium", "question": "Q1"}
        )
        session_id = session["session_id"]

        # Question 1: Correct (1/1)
        res1 = process_verification_step(session_id, "A", 4.0, False, self.db)
        self.assertEqual(res1["verification_status"], "in_progress")

        # Question 2: Incorrect (1/2)
        active_sess = get_verification_session(session_id)
        active_sess["current_challenge"]["answer"] = "B"
        res2 = process_verification_step(session_id, "WRONG", 5.0, False, self.db)
        self.assertEqual(res2["verification_status"], "in_progress")

        # Question 3: Correct (2/3 = 67% >= 67% -> Passed!)
        active_sess = get_verification_session(session_id)
        active_sess["current_challenge"]["answer"] = "C"
        res3 = process_verification_step(session_id, "C", 4.0, False, self.db)
        self.assertEqual(res3["verification_status"], "passed")
        self.assertEqual(res3["correct_count"], 2)
        self.assertEqual(res3["total_steps"], 3)

    def test_method_5_cognitive_accuracy_check_fail_and_bonus_retry(self):
        """Method 5: Failing min accuracy (1/3 = 33% < 67%) marks failed and extends steps."""
        session = init_verification_session(
            verification_method="accuracy_check",
            verification_steps=3,
            required_accuracy=67,
            first_challenge={"answer": "A", "type": "Quick Quizzes", "difficulty": "Medium", "question": "Q1"}
        )
        session_id = session["session_id"]

        # Q1: Correct
        process_verification_step(session_id, "A", 3.0, False, self.db)
        
        # Q2: Wrong
        active_sess = get_verification_session(session_id)
        active_sess["current_challenge"]["answer"] = "B"
        process_verification_step(session_id, "X", 4.0, False, self.db)

        # Q3: Wrong (Score 1/3 = 33% < 67% -> Failed, requires bonus question)
        active_sess = get_verification_session(session_id)
        active_sess["current_challenge"]["answer"] = "C"
        res3 = process_verification_step(session_id, "Y", 5.0, False, self.db)

        self.assertEqual(res3["verification_status"], "failed")
        self.assertEqual(res3["correct_count"], 1)
        self.assertEqual(res3["total_steps"], 4) # Step count expanded to allow recovery

    def test_alarm_schema_verification_fields_defaults(self):
        """Alarm schemas validate verification fields with expected defaults."""
        alarm = AlarmCreate(
            title="Rise & Shine",
            alarm_time="07:00",
            alarm_type="Daily"
        )
        self.assertEqual(alarm.verification_method, "multi_step")
        self.assertEqual(alarm.verification_steps, 3)
        self.assertEqual(alarm.required_accuracy, 67)
        self.assertEqual(alarm.consecutive_required, 2)
        self.assertEqual(alarm.time_limit, 20)

    def test_alarm_schema_custom_verification_methods(self):
        """Alarm schema supports all custom verification configurations."""
        alarm = AlarmCreate(
            title="Intense Wakeup",
            alarm_time="06:30",
            alarm_type="Daily",
            verification_method="consecutive_correct",
            verification_steps=3,
            required_accuracy=67,
            consecutive_required=3,
            time_limit=15
        )
        self.assertEqual(alarm.verification_method, "consecutive_correct")
        self.assertEqual(alarm.consecutive_required, 3)
        self.assertEqual(alarm.time_limit, 15)


if __name__ == "__main__":
    unittest.main()
