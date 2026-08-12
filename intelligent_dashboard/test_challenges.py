"""
Unit test suite for Cognitive Challenge Platform:
  1. Challenge Generation (7 types, Easy/Medium/Hard difficulties)
  2. Personalized Challenge Selection (adaptive difficulty based on performance metrics)
  3. Challenge Validation (answer correctness, attempts, time limit)
  4. Performance Tracking (storing type, difficulty, correct/incorrect, time taken, attempts, status, score)
  5. Challenge Completion Analysis & User Difficulty Updating
"""
import unittest
from fastapi.testclient import TestClient
from app import app
from database import SessionLocal, User, UserProfile, ChallengePerformance, Alarm
from challenge_generator import (
    generate_cognitive_challenge,
    verify_challenge_answer,
    generate_math_problem,
    generate_logic_puzzle,
    generate_memory_challenge,
    generate_word_game,
    generate_pattern_recognition,
    generate_riddle,
    generate_quick_quiz
)
import auth

class TestCognitiveChallengeSuite(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        cls.db = SessionLocal()

        # Create or fetch test user
        cls.user = cls.db.query(User).filter(User.email == "challenge_test@cognitivealarm.com").first()
        if not cls.user:
            cls.user = User(
                name="Cognitive Tester",
                email="challenge_test@cognitivealarm.com",
                password=auth.get_password_hash("testpass123"),
                role="user"
            )
            cls.db.add(cls.user)
            cls.db.commit()
            cls.db.refresh(cls.user)
            cls.db.add(UserProfile(user_id=cls.user.id, habit_score=50, streak=0))
            cls.db.commit()

        token = auth.create_access_token(cls.user.email, cls.user.role)
        cls.headers = {"Authorization": f"Bearer {token}"}

    @classmethod
    def tearDownClass(cls):
        cls.db.close()

    # ------------------------------------------------------------------
    # 1. CHALLENGE GENERATION (7 Types, Easy / Medium / Hard)
    # ------------------------------------------------------------------

    def test_01_generation_all_types_and_difficulties(self):
        types = [
            "Math Problems",
            "Logic Puzzles",
            "Memory Challenges",
            "Word Games",
            "Pattern Recognition",
            "Riddles",
            "Quick Quizzes"
        ]
        difficulties = ["Easy", "Medium", "Hard"]

        for ctype in types:
            for diff in difficulties:
                c = generate_cognitive_challenge(challenge_type=ctype, difficulty=diff)
                self.assertIsNotNone(c)
                self.assertIn("question", c)
                self.assertIn("expected_answer", c)
                self.assertEqual(c["difficulty"], diff)
                self.assertTrue(len(str(c["question"])) > 0)
        print("PASS - Requirement 1: Generated all 7 challenge types across Easy, Medium, Hard")

    # ------------------------------------------------------------------
    # 2. CHALLENGE VALIDATION & ANSWER VERIFICATION
    # ------------------------------------------------------------------

    def test_02_challenge_answer_validation(self):
        # Exact match
        self.assertTrue(verify_challenge_answer("42", "42"))
        # Case insensitive
        self.assertTrue(verify_challenge_answer("Saturday", "saturday"))
        # Whitespace tolerant
        self.assertTrue(verify_challenge_answer(" Egg ", "egg"))
        # Float numeric matching
        self.assertTrue(verify_challenge_answer("7.5", "7.50"))
        # Incorrect answer
        self.assertFalse(verify_challenge_answer("42", "43"))
        print("PASS - Requirement 3: Answer validation engine functioning accurately")

    def test_03_api_verify_endpoint(self):
        res = self.client.post("/api/challenges/verify", json={
            "expected": "Paris",
            "user_answer": "paris"
        }, headers=self.headers)
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.json()["success"])

        res_wrong = self.client.post("/api/challenges/verify", json={
            "expected": "Paris",
            "user_answer": "London"
        }, headers=self.headers)
        self.assertEqual(res_wrong.status_code, 200)
        self.assertFalse(res_wrong.json()["success"])
        print("PASS - Requirement 3: /api/challenges/verify endpoint verified")

    # ------------------------------------------------------------------
    # 3. PERFORMANCE TRACKING & COMPLETION ANALYSIS
    # ------------------------------------------------------------------

    def test_04_submit_challenge_performance_tracking_and_analysis(self):
        payload = {
            "challenge_type": "Math Problems",
            "difficulty": "Easy",
            "expected_answer": "25",
            "user_answer": "25",
            "time_taken": 12.5,
            "failed_attempts": 0,
            "time_limit_exceeded": False
        }
        res = self.client.post("/api/challenges/submit", json=payload, headers=self.headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()

        self.assertTrue(data["success"])
        self.assertEqual(data["completion_status"], "success")
        self.assertEqual(data["accuracy"], 100.0)
        self.assertGreater(data["score"], 0)
        self.assertIn("next_adapted_difficulty", data)

        # Check DB persistence
        db_perf = (
            self.db.query(ChallengePerformance)
            .filter(ChallengePerformance.user_id == self.user.id)
            .order_by(ChallengePerformance.created_at.desc())
            .first()
        )
        self.assertIsNotNone(db_perf)
        self.assertEqual(db_perf.challenge_type, "Math Problems")
        self.assertEqual(db_perf.status, "success")
        self.assertTrue(db_perf.is_correct)
        self.assertGreater(db_perf.score, 0)
        print("PASS - Requirement 4 & 5: Performance stored in DB & Completion Analysis returned")

    # ------------------------------------------------------------------
    # 4. PERSONALIZED CHALLENGE SELECTION & DIFFICULTY UPDATING
    # ------------------------------------------------------------------

    def test_05_personalized_selection_increases_difficulty_on_good_performance(self):
        # Insert 3 excellent performance logs
        for _ in range(3):
            perf = ChallengePerformance(
                user_id=self.user.id,
                challenge_type="Logic Puzzles",
                difficulty="Easy",
                accuracy=100.0,
                time_taken=10.0,
                failed_attempts=0,
                status="success",
                score=50.0,
                is_correct=True
            )
            self.db.add(perf)
        self.db.commit()

        # Request next challenge for Logic Puzzles with base Easy
        res = self.client.get("/api/challenges/generate?type=Logic Puzzles&difficulty=Easy", headers=self.headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        
        # Difficulty should be promoted from Easy to Medium
        self.assertEqual(data["difficulty"], "Medium")
        print("PASS - Requirement 2 & 5: Difficulty increased from Easy to Medium based on high performance")

if __name__ == "__main__":
    unittest.main()
