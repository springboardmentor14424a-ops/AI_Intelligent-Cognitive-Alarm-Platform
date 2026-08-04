"""
Comprehensive test suite for:
  - Alarm CRUD (Create, Read, Update, Delete)
  - Enable / Disable
  - All alarm types (Daily, Weekday, Weekend, One-Time, Smart Adaptive)
  - Input validation (Pydantic)
  - GET /today, GET /upcoming, POST /check-next
  - FCM token registration
  - Scheduler status endpoint
  - Recurring alarm logic
  - Multiple alarm support
"""
import unittest
from fastapi.testclient import TestClient
from app import app
from database import SessionLocal, User, UserProfile
import auth

class TestAlarmFullSuite(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        cls.db = SessionLocal()
        cls.created_alarm_ids = []

        # Ensure test user exists
        cls.user = cls.db.query(User).filter(User.email == "alarm_test@cognitivealarm.com").first()
        if not cls.user:
            cls.user = User(
                name="Alarm Test User",
                email="alarm_test@cognitivealarm.com",
                password=auth.get_password_hash("testpass"),
                role="user"
            )
            cls.db.add(cls.user)
            cls.db.commit()
            cls.db.refresh(cls.user)
            cls.db.add(UserProfile(user_id=cls.user.id, habit_score=35, streak=12))
            cls.db.commit()
            cls.db.refresh(cls.user)

        token = auth.create_access_token(cls.user.email, cls.user.role)
        cls.headers = {"Authorization": f"Bearer {token}"}

    @classmethod
    def tearDownClass(cls):
        cls.db.close()

    # ------------------------------------------------------------------
    # 1. CREATE — All alarm types
    # ------------------------------------------------------------------

    def test_01_create_daily_alarm(self):
        res = self.client.post("/alarms/", json={
            "title": "Daily Standup", "alarm_time": "09:00",
            "alarm_type": "Daily", "difficulty_level": "Easy",
            "sound": "Chimes", "vibration": True
        }, headers=self.headers)
        self.assertEqual(res.status_code, 201)
        d = res.json()
        self.assertEqual(d["alarm_type"], "Daily")
        self.created_alarm_ids.append(d["id"])
        print("PASS - Create Daily alarm")

    def test_02_create_weekday_alarm(self):
        res = self.client.post("/alarms/", json={
            "title": "Weekday Workout", "alarm_time": "06:30",
            "alarm_type": "Weekday", "difficulty_level": "Hard",
            "repeat_days": "Mon,Tue,Wed,Thu,Fri", "vibration": True
        }, headers=self.headers)
        self.assertEqual(res.status_code, 201)
        d = res.json()
        self.assertEqual(d["alarm_type"], "Weekday")
        self.created_alarm_ids.append(d["id"])
        print("PASS - Create Weekday alarm")

    def test_03_create_weekend_alarm(self):
        res = self.client.post("/alarms/", json={
            "title": "Weekend Rest", "alarm_time": "09:30",
            "alarm_type": "Weekend", "difficulty_level": "Easy",
            "repeat_days": "Sat,Sun"
        }, headers=self.headers)
        self.assertEqual(res.status_code, 201)
        d = res.json()
        self.assertEqual(d["alarm_type"], "Weekend")
        self.created_alarm_ids.append(d["id"])
        print("PASS - Create Weekend alarm")

    def test_04_create_onetime_alarm(self):
        res = self.client.post("/alarms/", json={
            "title": "Doctor Appointment", "alarm_time": "10:15",
            "alarm_type": "One-Time", "difficulty_level": "Medium"
        }, headers=self.headers)
        self.assertEqual(res.status_code, 201)
        d = res.json()
        self.assertEqual(d["alarm_type"], "One-Time")
        self.created_alarm_ids.append(d["id"])
        print("PASS - Create One-Time alarm")

    def test_05_create_smart_adaptive_alarm(self):
        res = self.client.post("/alarms/", json={
            "title": "Smart Wake", "alarm_time": "07:00",
            "alarm_type": "Smart Adaptive", "smart_alarm": True,
            "repeat_days": "Mon,Wed,Fri", "difficulty_level": "Hard",
            "challenge_required": "Math Puzzle"
        }, headers=self.headers)
        self.assertEqual(res.status_code, 201)
        d = res.json()
        self.assertEqual(d["alarm_type"], "Smart Adaptive")
        self.assertTrue(d["smart_alarm"])
        self.created_alarm_ids.append(d["id"])
        print("PASS - Create Smart Adaptive alarm")

    # ------------------------------------------------------------------
    # 2. READ
    # ------------------------------------------------------------------

    def test_06_get_all_alarms(self):
        res = self.client.get("/alarms/", headers=self.headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIsInstance(data, list)
        self.assertGreaterEqual(len(data), 5)  # at least 5 created above
        print(f"PASS - GET all alarms ({len(data)} found)")

    def test_07_get_single_alarm(self):
        alarm_id = self.created_alarm_ids[0]
        res = self.client.get(f"/alarms/{alarm_id}", headers=self.headers)
        self.assertEqual(res.status_code, 200)
        d = res.json()
        self.assertEqual(d["id"], alarm_id)
        self.assertIn("next_trigger", d)
        self.assertIn("next_trigger_iso", d["next_trigger"])
        print(f"PASS - GET single alarm #{alarm_id} with next_trigger")

    # ------------------------------------------------------------------
    # 3. SCHEDULING APIs
    # ------------------------------------------------------------------

    def test_08_get_today_alarms(self):
        res = self.client.get("/alarms/today", headers=self.headers)
        self.assertEqual(res.status_code, 200)
        self.assertIsInstance(res.json(), list)
        print("PASS - GET /alarms/today")

    def test_09_get_upcoming_alarms(self):
        res = self.client.get("/alarms/upcoming", headers=self.headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIsInstance(data, list)
        if data:
            self.assertIn("next_trigger", data[0])
            self.assertIn("next_trigger_iso", data[0]["next_trigger"])
        print("PASS - GET /alarms/upcoming (sorted by next trigger)")

    def test_10_check_next_alarm_smart_adaptive(self):
        res = self.client.post("/alarms/check-next", headers=self.headers)
        self.assertEqual(res.status_code, 200)
        d = res.json()
        self.assertEqual(d["status"], "success")
        self.assertIn("next_alarm", d)
        self.assertIn("scheduler", d)
        self.assertGreater(d["total_active"], 0)
        print("PASS - POST /alarms/check-next (Smart Adaptive + Scheduler status)")

    def test_11_scheduler_status(self):
        res = self.client.get("/alarms/scheduler", headers=self.headers)
        self.assertEqual(res.status_code, 200)
        d = res.json()
        self.assertIn("running", d)
        self.assertIn("jobs", d)
        print(f"PASS - GET /alarms/scheduler (running={d['running']}, jobs={len(d['jobs'])})")

    # ------------------------------------------------------------------
    # 4. ENABLE / DISABLE
    # ------------------------------------------------------------------

    def test_12_disable_alarm(self):
        alarm_id = self.created_alarm_ids[0]
        res = self.client.patch(f"/alarms/{alarm_id}/disable", headers=self.headers)
        self.assertEqual(res.status_code, 200)
        self.assertFalse(res.json()["is_active"])
        print(f"PASS - PATCH /alarms/{alarm_id}/disable")

    def test_13_enable_alarm(self):
        alarm_id = self.created_alarm_ids[0]
        res = self.client.patch(f"/alarms/{alarm_id}/enable", headers=self.headers)
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.json()["is_active"])
        print(f"PASS - PATCH /alarms/{alarm_id}/enable")

    # ------------------------------------------------------------------
    # 5. UPDATE (Full customization)
    # ------------------------------------------------------------------

    def test_14_update_alarm_customization(self):
        alarm_id = self.created_alarm_ids[2]
        res = self.client.put(f"/alarms/{alarm_id}", json={
            "title": "Weekend Meditation",
            "alarm_time": "08:00",
            "difficulty_level": "Easy",
            "sound": "Zen Bell",
            "vibration": False,
            "challenge_required": "Typo Solver"
        }, headers=self.headers)
        self.assertEqual(res.status_code, 200)
        d = res.json()
        self.assertEqual(d["title"], "Weekend Meditation")
        self.assertEqual(d["sound"], "Zen Bell")
        self.assertFalse(d["vibration"])
        print(f"PASS - PUT /alarms/{alarm_id} (full customization)")

    # ------------------------------------------------------------------
    # 6. FCM Token Registration
    # ------------------------------------------------------------------

    def test_15_register_fcm_token(self):
        res = self.client.post("/alarms/fcm-token", json={
            "fcm_token": "test_device_token_abc123xyz"
        }, headers=self.headers)
        self.assertEqual(res.status_code, 200)
        self.assertIn("registered", res.json()["message"].lower())
        print("PASS - POST /alarms/fcm-token (FCM token registered)")

    # ------------------------------------------------------------------
    # 7. INPUT VALIDATION & AM/PM FORMAT SUPPORT
    # ------------------------------------------------------------------

    def test_16_ampm_alarm_time_support(self):
        """Verify AM/PM 12-hour format inputs (e.g. '07:30 PM') normalize to 24-hour ('19:30')."""
        res = self.client.post("/alarms/", json={
            "title": "Evening Run AM/PM", "alarm_time": "07:30 PM", "alarm_type": "Daily"
        }, headers=self.headers)
        self.assertEqual(res.status_code, 201)
        d = res.json()
        self.assertEqual(d["alarm_time"], "19:30")
        self.created_alarm_ids.append(d["id"])
        print("PASS - AM/PM 12-hour time format ('07:30 PM' -> '19:30') normalized successfully")

    def test_16_invalid_alarm_time_rejected(self):
        res = self.client.post("/alarms/", json={
            "title": "Bad", "alarm_time": "25:61"
        }, headers=self.headers)
        self.assertEqual(res.status_code, 422)
        print("PASS - Invalid alarm_time '25:61' rejected with 422")

    def test_17_invalid_alarm_type_rejected(self):
        res = self.client.post("/alarms/", json={
            "title": "Bad Type", "alarm_time": "07:00", "alarm_type": "NotAType"
        }, headers=self.headers)
        self.assertEqual(res.status_code, 422)
        print("PASS - Invalid alarm_type rejected with 422")

    def test_18_invalid_difficulty_rejected(self):
        res = self.client.post("/alarms/", json={
            "title": "Bad Diff", "alarm_time": "07:00", "difficulty_level": "Extreme"
        }, headers=self.headers)
        self.assertEqual(res.status_code, 422)
        print("PASS - Invalid difficulty_level rejected with 422")

    # ------------------------------------------------------------------
    # 8. ERROR CASES
    # ------------------------------------------------------------------

    def test_19_get_nonexistent_alarm(self):
        res = self.client.get("/alarms/999999", headers=self.headers)
        self.assertEqual(res.status_code, 404)
        print("PASS - GET /alarms/999999 returns 404")

    def test_20_multiple_alarm_support(self):
        """Verify multiple alarms can coexist for same user."""
        res = self.client.get("/alarms/", headers=self.headers)
        self.assertEqual(res.status_code, 200)
        alarms = res.json()
        types_found = {a["alarm_type"] for a in alarms if a["alarm_type"]}
        self.assertGreaterEqual(len(types_found), 3)
        print(f"PASS - Multiple alarms supported: {types_found}")

    # ------------------------------------------------------------------
    # 9. DELETE all test alarms (cleanup)
    # ------------------------------------------------------------------

    def test_21_delete_all_test_alarms(self):
        for alarm_id in self.created_alarm_ids:
            res = self.client.delete(f"/alarms/{alarm_id}", headers=self.headers)
            self.assertEqual(res.status_code, 200)
            # Confirm 404 after delete
            confirm = self.client.get(f"/alarms/{alarm_id}", headers=self.headers)
            self.assertEqual(confirm.status_code, 404)
        print(f"PASS - DELETE all {len(self.created_alarm_ids)} test alarms confirmed 404")


if __name__ == "__main__":
    print("\n" + "="*60)
    print("  AI Cognitive Alarm Platform - Full Alarm Test Suite")
    print("="*60 + "\n")
    unittest.main(verbosity=2)
