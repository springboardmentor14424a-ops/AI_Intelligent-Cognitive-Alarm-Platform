"""
Comprehensive Integration & Unit Test Suite for Modules 7 to 12:
- Module 7: Wake-Up Verification & Behavioral Analytics Engine
- Module 8: Habit Scoring Engine (35/25/20/20 weighted model)
- Module 9: Recommendation Engine (5 pillars + unified dossier)
- Module 10: Dashboard & Analytics API endpoints
- Module 11: Notification & Reminder System (Bedtime, Habit, Challenge, Announcements)
- Module 12: Reports & Export System (PDF, Excel)
"""
import pytest
import datetime
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from database import Base, User, UserProfile, Alarm, ChallengePerformance, HabitScoreLog, WakeLog, Announcement
from app import app, get_db
import auth
from verification_engine import WakeUpVerificationEngine
from behavioral_engine import BehavioralAnalyticsEngine
from habit_engine import HabitScoringEngine
from recommendation_engine import RecommendationEngine
from report_generator import ReportGenerator

TEST_DATABASE_URL = "sqlite:///./test_modules_7_12.db"
engine_test = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestSession = sessionmaker(autocommit=False, autoflush=False, bind=engine_test)
client = TestClient(app)

def override_get_db():
    db = TestSession()
    try:
        yield db
    finally:
        db.close()

@pytest.fixture(scope="module", autouse=True)
def setup_test_db():
    app.dependency_overrides[get_db] = override_get_db
    Base.metadata.create_all(bind=engine_test)
    db = TestSession()

    # Seed Admin
    admin = User(
        name="Admin Test",
        email="m7admin@cognitive.com",
        password=auth.get_password_hash("admin123"),
        role="administrator"
    )
    db.add(admin)
    db.commit()
    db.refresh(admin)

    # Seed User
    user = User(
        name="Module Test User",
        email="m7user@cognitive.com",
        password=auth.get_password_hash("user123"),
        role="user"
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    profile = UserProfile(
        user_id=user.id,
        wake_up_time="06:30",
        sleep_time="22:30",
        sleep_duration=8.0,
        productivity_goal="Focus on Machine Learning",
        streak=5,
        habit_score=78,
        wake_up_consistency_score=80.0,
        challenge_completion_score=75.0,
        snooze_reduction_score=85.0,
        sleep_schedule_adherence_score=70.0,
        productivity_score=80.0
    )
    db.add(profile)

    # Seed Alarm
    alarm = Alarm(
        user_id=user.id,
        alarm_name="Morning Focus",
        alarm_time="06:30",
        alarm_type="Daily",
        verification_method="Multi-Step Challenges",
        multi_step_count=2,
        consecutive_target=2,
        time_limit_sec=45,
        snooze_limit=3
    )
    db.add(alarm)
    db.commit()
    db.refresh(alarm)

    # Seed Challenge Performances
    p1 = ChallengePerformance(
        user_id=user.id,
        alarm_id=alarm.id,
        challenge_type="Math Problems",
        difficulty="Medium",
        accuracy=95.0,
        time_taken=12.5,
        failed_attempts=0,
        status="success",
        score=95.0,
        is_correct=True,
        verification_method="Multi-Step Challenges",
        wakefulness_score=8.5
    )
    db.add(p1)

    # Seed WakeLog
    w1 = WakeLog(
        user_id=user.id,
        alarm_id=alarm.id,
        scheduled_time="06:30",
        actual_wake_time="06:35",
        drift_minutes=5.0,
        snooze_count=1,
        dismissal_status="verified_dismissal",
        wakefulness_rating=8.0
    )
    db.add(w1)
    db.commit()
    db.close()

    yield

    Base.metadata.drop_all(bind=engine_test)
    if get_db in app.dependency_overrides:
        del app.dependency_overrides[get_db]

def get_auth_token(email="m7user@cognitive.com", role="user"):
    return auth.create_access_token(email, role)

# ==============================================================================
# 1. VERIFICATION ENGINE TESTS
# ==============================================================================
class TestWakeUpVerification:

    def test_01_generate_all_verification_methods(self):
        methods = [
            "Puzzle Completion",
            "Multi-Step Challenges",
            "Consecutive Correct Answers",
            "Time-Based Challenges",
            "Cognitive Accuracy Checks"
        ]
        for m in methods:
            challenge = WakeUpVerificationEngine.generate_verification_challenge(
                verification_method=m,
                difficulty="Medium",
                step_index=1,
                total_steps=2,
                consecutive_streak=0,
                consecutive_target=2,
                time_limit_sec=30
            )
            assert challenge["verification_method"] == m
            assert "expected_answer" in challenge
            assert "challenge_type" in challenge

    def test_02_wakefulness_assessment(self):
        res_high = WakeUpVerificationEngine.assess_wakefulness(
            accuracy=100.0, time_taken=10.0, failed_attempts=0, verification_method="Puzzle Completion"
        )
        assert res_high["wakefulness_score"] >= 8.0

        res_low = WakeUpVerificationEngine.assess_wakefulness(
            accuracy=40.0, time_taken=60.0, failed_attempts=3, verification_method="Puzzle Completion"
        )
        assert res_low["wakefulness_score"] < 7.0

    def test_03_api_generate_and_validate_dismissal(self):
        token = get_auth_token()
        headers = {"Authorization": f"Bearer {token}"}

        # 1. Generate challenge
        res = client.post("/api/verification/generate", json={
            "verification_method": "Puzzle Completion",
            "difficulty": "Easy"
        }, headers=headers)
        assert res.status_code == 200
        data = res.json()
        expected = data["challenge"]["expected_answer"]

        # 2. Dismiss with correct answer
        dismiss_res = client.post("/api/verification/validate-dismiss", json={
            "verification_method": "Puzzle Completion",
            "user_answer": expected,
            "expected_answer": expected,
            "difficulty": "Easy",
            "time_taken": 12.0,
            "failed_attempts": 0
        }, headers=headers)
        assert dismiss_res.status_code == 200
        assert dismiss_res.json()["can_dismiss_alarm"] is True

    def test_04_api_snooze_and_wake_confirm(self):
        token = get_auth_token()
        headers = {"Authorization": f"Bearer {token}"}

        db = TestSession()
        alarm = db.query(Alarm).first()
        alarm_id = alarm.id if alarm else None
        db.close()

        # Test snooze request
        snooze_res = client.post("/api/verification/snooze", json={
            "alarm_id": alarm_id,
            "snooze_count": 1
        }, headers=headers)
        assert snooze_res.status_code == 200
        assert "allowed" in snooze_res.json()

        # Test wake confirmation
        confirm_res = client.post("/api/verification/wake-confirm", json={
            "alarm_id": alarm_id,
            "wakefulness_rating": 9.0,
            "notes": "Feeling energized!"
        }, headers=headers)
        assert confirm_res.status_code == 200
        assert confirm_res.json()["success"] is True

# ==============================================================================
# 2. BEHAVIORAL ANALYTICS & HABIT SCORING TESTS
# ==============================================================================
class TestBehavioralAndHabitEngines:

    def test_05_behavioral_dossier_and_sub_analytics(self):
        db = TestSession()
        user = db.query(User).filter(User.email == "m7user@cognitive.com").first()
        dossier = BehavioralAnalyticsEngine.get_full_behavioral_dossier(user.id, db)
        db.close()

        assert "snooze_patterns" in dossier
        assert "wake_up_behavior" in dossier
        assert "productivity_correlation" in dossier
        assert "habit_consistency" in dossier
        assert "sleep_patterns" in dossier

    def test_06_habit_scoring_35_25_20_20_formula(self):
        db = TestSession()
        user = db.query(User).filter(User.email == "m7user@cognitive.com").first()
        score_data = HabitScoringEngine.compute_and_persist_habit_score(user.id, db)
        db.close()

        assert "habit_score" in score_data
        assert "subscores" in score_data
        assert "weights" in score_data
        assert score_data["weights"]["wake_up_consistency"] == "35%"
        assert score_data["weights"]["challenge_completion"] == "25%"
        assert score_data["weights"]["snooze_reduction"] == "20%"
        assert score_data["weights"]["sleep_schedule_adherence"] == "20%"

    def test_07_api_habit_endpoints(self):
        token = get_auth_token()
        headers = {"Authorization": f"Bearer {token}"}

        res = client.get("/api/habit/score", headers=headers)
        assert res.status_code == 200
        assert "habit_score" in res.json()

        res_recalc = client.post("/api/habit/recalculate", headers=headers)
        assert res_recalc.status_code == 200

        res_hist = client.get("/api/habit/history", headers=headers)
        assert res_hist.status_code == 200
        assert isinstance(res_hist.json(), list)

# ==============================================================================
# 3. RECOMMENDATION ENGINE TESTS
# ==============================================================================
class TestRecommendationEngine:

    def test_08_five_pillar_recommendations(self):
        db = TestSession()
        user = db.query(User).filter(User.email == "m7user@cognitive.com").first()
        dossier = RecommendationEngine.get_unified_recommendation_dossier(user.id, db)
        db.close()

        assert len(dossier["sleep_improvement"]) > 0
        assert len(dossier["wake_up_optimization"]) > 0
        assert len(dossier["habit_improvement"]) > 0
        assert len(dossier["productivity"]) > 0
        assert len(dossier["personalized_challenges"]) > 0

    def test_09_api_recommendation_endpoints(self):
        token = get_auth_token()
        headers = {"Authorization": f"Bearer {token}"}

        res_all = client.get("/api/recommendations/all", headers=headers)
        assert res_all.status_code == 200
        assert "sleep_improvement" in res_all.json()

# ==============================================================================
# 4. NOTIFICATION & ANNOUNCEMENT TESTS
# ==============================================================================
class TestNotificationAndAnnouncements:

    def test_10_reminder_apis(self):
        token = get_auth_token()
        headers = {"Authorization": f"Bearer {token}"}

        for path in [
            "/api/notifications/reminders/bedtime",
            "/api/notifications/reminders/habit",
            "/api/notifications/reminders/challenge",
            "/api/notifications/reminders/progress"
        ]:
            res = client.post(path, headers=headers)
            assert res.status_code == 200
            assert res.json()["success"] is True

    def test_11_admin_broadcast_announcement(self):
        admin_token = get_auth_token("m7admin@cognitive.com", "administrator")
        headers = {"Authorization": f"Bearer {admin_token}"}

        broadcast_res = client.post("/api/admin/announcements/broadcast", data={
            "title": "Platform Update v2.5",
            "content": "Wake-up verification and behavioral engines are now active.",
            "target_role": "all",
            "priority": "high"
        }, headers=headers)
        assert broadcast_res.status_code == 200
        assert broadcast_res.json()["success"] is True

# ==============================================================================
# 5. REPORT GENERATION & EXPORT TESTS (PDF & EXCEL)
# ==============================================================================
class TestReportExports:

    def test_12_export_pdf_report(self):
        token = get_auth_token()
        headers = {"Authorization": f"Bearer {token}"}

        res = client.get("/api/reports/export/pdf?report_type=all", headers=headers)
        assert res.status_code == 200
        assert res.headers["content-type"] == "application/pdf"
        assert len(res.content) > 100

    def test_13_export_excel_report(self):
        token = get_auth_token()
        headers = {"Authorization": f"Bearer {token}"}

        res = client.get("/api/reports/export/excel?report_type=all", headers=headers)
        assert res.status_code == 200
        assert "spreadsheetml" in res.headers["content-type"]
        assert len(res.content) > 100

    def test_14_adaptive_rating_scale_compensation(self):
        """Feature 1: If user gets question wrong, +1 compensation question is added."""
        db = TestSession()
        user = db.query(User).filter(User.email == "m7user@cognitive.com").first()

        res = WakeUpVerificationEngine.validate_and_dismiss_alarm(
            user_id=user.id,
            db=db,
            alarm_id=None,
            expected_answer="42",
            user_answer="99", # Incorrect
            time_taken=12.0,
            failed_attempts=1,
            verification_method="Puzzle Completion",
            total_steps=1
        )
        db.close()

        assert res["success"] is False
        assert res["can_dismiss_alarm"] is False
        assert res["next_step_required"] is True
        assert res["next_step"]["total_steps"] == 2 # +1 compensation question added
        assert "compensation question added" in res["next_step"]["instructions"].lower()

    def test_15_snooze_restriction(self):
        """Feature 2: Snooze is restricted while required questions remain unsolved."""
        db = TestSession()
        user = db.query(User).filter(User.email == "m7user@cognitive.com").first()
        alarm = db.query(Alarm).filter(Alarm.user_id == user.id).first()

        # Snooze attempted while questions unsolved -> Rejected
        blocked = WakeUpVerificationEngine.process_snooze_request(
            user_id=user.id,
            alarm_id=alarm.id,
            db=db,
            questions_solved=False
        )
        assert blocked["allowed"] is False
        assert "restricted" in blocked["reason"].lower()

        # Snooze attempted when questions solved -> Allowed
        allowed = WakeUpVerificationEngine.process_snooze_request(
            user_id=user.id,
            alarm_id=alarm.id,
            db=db,
            questions_solved=True
        )
        assert allowed["allowed"] is True
        db.close()

    def test_16_unified_wake_confirmation_popup(self):
        """Features 3, 4, 5: Pop-up Yes/No and 3-level wakefulness ratings recorded in DB."""
        token = get_auth_token()
        headers = {"Authorization": f"Bearer {token}"}

        # Test A: Yes (Fully awake, rating 5)
        res_yes = client.post("/api/verification/wake-confirm", json={
            "confirmed": True,
            "wakefulness_level": "Fully awake",
            "wakefulness_rating": 5.0,
            "notes": "Feeling sharp and energetic"
        }, headers=headers)
        assert res_yes.status_code == 200
        data_yes = res_yes.json()
        assert data_yes["success"] is True
        assert data_yes["confirmed"] is True
        assert data_yes["wakefulness_level"] == "Fully awake"
        assert data_yes["wakefulness_rating"] == 5.0
        assert data_yes["streak_bonus_points"] == 3

        # Test B: Slightly awake (rating 2)
        res_slight = client.post("/api/verification/wake-confirm", json={
            "confirmed": True,
            "wakefulness_level": "Slightly awake",
            "wakefulness_rating": 2.0,
            "notes": "Mild grogginess"
        }, headers=headers)
        assert res_slight.status_code == 200
        assert res_slight.json()["wakefulness_level"] == "Slightly awake"

        # Test C: No (Drowsy / Not awake)
        res_no = client.post("/api/verification/wake-confirm", json={
            "confirmed": False,
            "wakefulness_level": "Not awake / Drowsy",
            "wakefulness_rating": 1.0,
            "notes": "Still sleepy"
        }, headers=headers)
        assert res_no.status_code == 200
        assert res_no.json()["confirmed"] is False
        assert res_no.json()["streak_bonus_points"] == 0

    def test_17_habit_score_35_25_20_20_exact_model(self):
        """Module 8: Verify exact weighted scoring formula:
        Wake-Up Consistency (35%) + Challenge Completion (25%) + Snooze Reduction (20%) + Sleep Schedule Adherence (20%)
        and productivity scoring."""
        db = TestSession()
        user = db.query(User).filter(User.email == "m7user@cognitive.com").first()

        score_data = HabitScoringEngine.compute_and_persist_habit_score(user.id, db)
        db.close()

        subs = score_data["subscores"]
        expected_score = round(
            (subs["wake_up_consistency"] * 0.35) +
            (subs["challenge_completion"] * 0.25) +
            (subs["snooze_reduction"] * 0.20) +
            (subs["sleep_schedule_adherence"] * 0.20),
            1
        )
        assert score_data["habit_score"] == expected_score
        assert "productivity_score" in score_data
        assert 0.0 <= score_data["productivity_score"] <= 100.0

    def test_18_circadian_target_update_recalculation(self):
        """Module 8 & 10: Calibration of target bedtime and wake-up time triggers score re-evaluation."""
        token = get_auth_token()
        headers = {"Authorization": f"Bearer {token}"}

        res = client.post("/api/user/circadian-target", json={
            "bed_time": "22:30",
            "wake_up_time": "06:30",
            "sleep_duration": 8.0
        }, headers=headers)
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        assert data["bed_time"] == "22:30"
        assert data["wake_up_time"] == "06:30"
        assert "updated_habit_score" in data
        assert "productivity_score" in data

    def test_19_sleep_adherence_checkin_yes_and_no(self):
        """Module 8 & 10: Sleep adherence prompt Yes/No check-in awarding designated score (+95 for Yes, +45 for No)."""
        token = get_auth_token()
        headers = {"Authorization": f"Bearer {token}"}

        # Check-in Yes
        res_yes = client.post("/api/habit/sleep-adherence", json={
            "adhered": True,
            "notes": "Slept on time at 22:30, woke at 06:30 sharp."
        }, headers=headers)
        assert res_yes.status_code == 200
        data_yes = res_yes.json()
        assert data_yes["success"] is True
        assert data_yes["adhered"] is True
        assert data_yes["awarded_score"] == 95.0
        assert "new_habit_score" in data_yes

        # Check-in No
        res_no = client.post("/api/habit/sleep-adherence", json={
            "adhered": False,
            "notes": "Stayed up reading until 01:00."
        }, headers=headers)
        assert res_no.status_code == 200
        data_no = res_no.json()
        assert data_no["success"] is True
        assert data_no["adhered"] is False
        assert data_no["awarded_score"] == 45.0
        assert "new_habit_score" in data_no

        # Check history
        res_hist = client.get("/api/habit/sleep-adherence/history", headers=headers)
        assert res_hist.status_code == 200
        history = res_hist.json()
        assert len(history) >= 2
        assert history[0]["adhered"] in [True, False]

    def test_20_admin_recommendation_and_sleep_monitoring(self):
        """Module 10: Admin Dashboard recommendation monitoring and sleep adherence logs."""
        admin_token = get_auth_token("m7admin@cognitive.com", "administrator")
        headers = {"Authorization": f"Bearer {admin_token}"}

        # Monitoring endpoint
        res_mon = client.get("/api/admin/recommendations/monitoring", headers=headers)
        assert res_mon.status_code == 200
        mon_data = res_mon.json()
        assert mon_data["success"] is True
        assert "monitoring_metrics" in mon_data
        assert "recent_sleep_adherence_logs" in mon_data
        assert mon_data["monitoring_metrics"]["total_adherence_checkins"] >= 2

        # Sleep adherence logs list endpoint
        res_adh = client.get("/api/admin/sleep-adherence", headers=headers)
        assert res_adh.status_code == 200
        adh_data = res_adh.json()
        assert adh_data["success"] is True
        assert len(adh_data["logs"]) >= 2

