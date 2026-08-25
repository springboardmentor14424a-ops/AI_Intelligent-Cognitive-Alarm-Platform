"""
Unit & Integration Test Suite for Module 5: Production, AI Improvement & Maintenance

Tests:
1. AI Model Improvement (MLEngine predictions, snooze & oversleep risk)
2. Advanced Personalization (Challenge rankings, circadian recommendations, apply API)
3. Real-Time Notifications (Bedtime, habit streak, progress digest)
4. Production Monitoring (System health, metrics, database backup & restore)
5. User Feedback & Engagement Analytics (Submit feedback, validation, admin moderation, analytics)
"""

import pytest
import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

from database import Base, User, UserProfile, Alarm, ChallengePerformance, Feedback, ActivityLog
from app import app, get_db
import auth
from ml_engine import MLEngine
from notification_service import send_bedtime_reminder, send_habit_reminder, send_progress_notification

# In-memory test DB
TEST_DATABASE_URL = "sqlite:///./test_module5.db"
test_engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)
client = TestClient(app)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(scope="module", autouse=True)
def setup_module5_db():
    app.dependency_overrides[get_db] = override_get_db
    Base.metadata.create_all(bind=test_engine)
    db = TestingSessionLocal()

    # Seed Admin
    admin = User(
        name="Module5 Admin",
        email="m5admin@cognitive.com",
        password=auth.get_password_hash("admin123"),
        role="administrator",
        account_status="active"
    )
    db.add(admin)
    db.commit()
    db.refresh(admin)
    db.add(UserProfile(user_id=admin.id, wake_up_time="06:30", habit_score=85, streak=12))

    # Seed Standard User
    user = User(
        name="Module5 User",
        email="m5user@cognitive.com",
        password=auth.get_password_hash("user123"),
        role="user",
        account_status="active"
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    db.add(UserProfile(user_id=user.id, wake_up_time="07:00", sleep_time="22:30", sleep_duration=8.0, habit_score=75, streak=6))

    # Seed User Alarms
    alarm1 = Alarm(user_id=user.id, alarm_name="Morning Wakeup", alarm_time="07:00", snooze_count=1, alarm_status=True)
    db.add(alarm1)

    # Seed Challenge Performance History for ML engine
    perf1 = ChallengePerformance(
        user_id=user.id,
        challenge_type="Math Problems",
        difficulty="Medium",
        accuracy=95.0,
        time_taken=12.5,
        failed_attempts=0,
        status="success",
        score=95.0,
        is_correct=True
    )
    perf2 = ChallengePerformance(
        user_id=user.id,
        challenge_type="Logic Puzzles",
        difficulty="Medium",
        accuracy=80.0,
        time_taken=18.0,
        failed_attempts=1,
        status="success",
        score=80.0,
        is_correct=True
    )
    perf3 = ChallengePerformance(
        user_id=user.id,
        challenge_type="Memory Challenges",
        difficulty="Easy",
        accuracy=60.0,
        time_taken=25.0,
        failed_attempts=2,
        status="success",
        score=30.0,
        is_correct=True
    )
    db.add_all([perf1, perf2, perf3])
    db.commit()
    db.close()

    yield

    Base.metadata.drop_all(bind=test_engine)
    if get_db in app.dependency_overrides:
        del app.dependency_overrides[get_db]




def get_token(email="m5user@cognitive.com", password="user123"):
    res = client.post("/api/auth/login", data={"username": email, "password": password}, follow_redirects=False)
    if "access_token" in res.cookies:
        return res.cookies.get("access_token")
    # Fallback to direct token creation
    return auth.create_access_token(email, "user")


def get_admin_token():
    res = client.post("/api/auth/login", data={"username": "m5admin@cognitive.com", "password": "admin123"}, follow_redirects=False)
    if "access_token" in res.cookies:
        return res.cookies.get("access_token")
    return auth.create_access_token("m5admin@cognitive.com", "administrator")



# ==============================================================================
# 1. AI MODEL IMPROVEMENT & PREDICTIONS TESTS
# ==============================================================================

class TestAIModelImprovement:

    def test_01_ml_engine_snooze_oversleep_risk_prediction(self):
        db = TestingSessionLocal()
        user = db.query(User).filter(User.email == "m5user@cognitive.com").first()
        prediction = MLEngine.predict_snooze_and_oversleep_risk(user.id, db)
        db.close()

        assert "snooze_probability" in prediction
        assert "oversleep_risk" in prediction
        assert prediction["oversleep_risk"] in ["Low", "Moderate", "High"]
        assert 5.0 <= prediction["snooze_probability"] <= 95.0
        assert len(prediction["factors"]) > 0

    def test_02_personalized_challenge_ranking(self):
        db = TestingSessionLocal()
        user = db.query(User).filter(User.email == "m5user@cognitive.com").first()
        rankings = MLEngine.get_personalized_challenge_ranking(user.id, db)
        db.close()

        assert len(rankings) == 7
        assert rankings[0]["challenge_type"] == "Math Problems"  # Highest accuracy (95%) and speed (12.5s)
        assert rankings[0]["rank"] == 1
        assert "efficacy_score" in rankings[0]

    def test_03_circadian_recommendations(self):
        db = TestingSessionLocal()
        user = db.query(User).filter(User.email == "m5user@cognitive.com").first()
        recs = MLEngine.get_circadian_recommendations(user.id, db)
        db.close()

        assert recs["target_wake_up"] == "07:00"
        assert recs["optimal_bedtime"] == "23:00"  # 07:00 - 8h = 23:00
        assert recs["recommended_challenge_type"] == "Math Problems"
        assert recs["recommended_difficulty"] in ["Easy", "Medium", "Hard"]
        assert len(recs["ai_insights"]) >= 2


# ==============================================================================
# 2. ADVANCED PERSONALIZATION API TESTS
# ==============================================================================

class TestPersonalizationAPIs:

    def test_04_api_get_predictions(self):
        token = get_token()
        res = client.get("/api/ai/predictions", headers={"Authorization": f"Bearer {token}"})
        assert res.status_code == 200
        data = res.json()
        assert "snooze_probability" in data
        assert "oversleep_risk" in data

    def test_05_api_get_personalization_summary(self):
        token = get_token()
        res = client.get("/api/ai/personalization-summary", headers={"Authorization": f"Bearer {token}"})
        assert res.status_code == 200
        data = res.json()
        assert "optimal_bedtime" in data
        assert "recommended_challenge_type" in data

    def test_06_api_apply_recommendations(self):
        token = get_token()
        res = client.post("/api/ai/apply-recommendations", headers={"Authorization": f"Bearer {token}"})
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        assert data["applied_settings"]["challenge_preference"] == "Math Problems"


# ==============================================================================
# 3. REAL-TIME NOTIFICATIONS TESTS
# ==============================================================================

class TestRealTimeNotifications:

    def test_07_send_bedtime_reminder(self):
        db = TestingSessionLocal()
        user = db.query(User).filter(User.email == "m5user@cognitive.com").first()
        success = send_bedtime_reminder(user.id, "22:30", "07:00")
        db.close()
        assert success is True

    def test_08_send_habit_reminder(self):
        db = TestingSessionLocal()
        user = db.query(User).filter(User.email == "m5user@cognitive.com").first()
        success = send_habit_reminder(user.id, 7, 85)
        db.close()
        assert success is True

    def test_09_send_progress_notification(self):
        db = TestingSessionLocal()
        user = db.query(User).filter(User.email == "m5user@cognitive.com").first()
        success = send_progress_notification(user.id, 250.0, 88.5)
        db.close()
        assert success is True

    def test_10_api_test_notification_endpoint(self):
        token = get_token()
        res = client.post("/api/ai/test-notification?notif_type=bedtime", headers={"Authorization": f"Bearer {token}"})
        assert res.status_code == 200
        assert res.json()["success"] is True


# ==============================================================================
# 4. PRODUCTION MONITORING & BACKUP TESTS
# ==============================================================================

class TestProductionMonitoringAndBackup:

    def test_11_system_health_check_public(self):
        res = client.get("/api/system/health")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] in ["healthy", "degraded"]
        assert "database_connected" in data
        assert "api_version" in data

    def test_12_admin_system_metrics(self):
        admin_token = get_admin_token()
        res = client.get("/api/admin/system/metrics", headers={"Authorization": f"Bearer {admin_token}"})
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "healthy"
        assert "counts" in data["database"]
        assert data["database"]["counts"]["users"] >= 2

    def test_13_admin_create_and_list_backup(self):
        admin_token = get_admin_token()
        # Create backup
        res_create = client.post("/api/admin/backup/create", headers={"Authorization": f"Bearer {admin_token}"})
        assert res_create.status_code == 200
        data = res_create.json()
        assert data["success"] is True
        assert "backup_alarm_platform_" in data["filename"]

        # List backups
        res_list = client.get("/api/admin/backup/list", headers={"Authorization": f"Bearer {admin_token}"})
        assert res_list.status_code == 200
        backups = res_list.json()["backups"]
        assert len(backups) >= 1

    def test_14_admin_download_backup(self):
        admin_token = get_admin_token()
        res_list = client.get("/api/admin/backup/list", headers={"Authorization": f"Bearer {admin_token}"})
        filename = res_list.json()["backups"][0]["filename"]

        res_down = client.get(f"/api/admin/backup/download/{filename}", headers={"Authorization": f"Bearer {admin_token}"})
        assert res_down.status_code == 200
        assert res_down.headers.get("content-type") == "application/octet-stream"


# ==============================================================================
# 5. USER FEEDBACK & ENGAGEMENT ANALYTICS TESTS
# ==============================================================================

class TestFeedbackAndEngagement:

    def test_15_submit_feedback_user(self):
        token = get_token()
        res = client.post(
            "/api/user/feedback",
            data={
                "rating": 5,
                "category": "challenge",
                "comment": "The adaptive math challenges woke me up instantly! Love the platform."
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        assert "feedback_id" in data

    def test_16_submit_feedback_invalid_rating(self):
        token = get_token()
        res = client.post(
            "/api/user/feedback",
            data={
                "rating": 6,  # Invalid (> 5)
                "category": "ui",
                "comment": "Too high rating"
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        assert res.status_code == 400

    def test_17_get_user_my_feedback(self):
        token = get_token()
        res = client.get("/api/user/feedback/my", headers={"Authorization": f"Bearer {token}"})
        assert res.status_code == 200
        data = res.json()
        assert len(data) >= 1
        assert data[0]["rating"] == 5

    def test_18_admin_get_all_feedback_and_moderate(self):
        admin_token = get_admin_token()
        # Get all feedback
        res_all = client.get("/api/admin/feedback", headers={"Authorization": f"Bearer {admin_token}"})
        assert res_all.status_code == 200
        fb_list = res_all.json()["feedbacks"]
        assert len(fb_list) >= 1
        fb_id = fb_list[0]["id"]

        # Moderate status
        res_mod = client.post(
            f"/api/admin/feedback/{fb_id}/status",
            data={"status": "resolved"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert res_mod.status_code == 200
        assert res_mod.json()["success"] is True

    def test_19_admin_engagement_analytics(self):
        admin_token = get_admin_token()
        res = client.get("/api/admin/analytics/engagement", headers={"Authorization": f"Bearer {admin_token}"})
        assert res.status_code == 200
        data = res.json()
        assert "user_retention" in data
        assert "challenge_metrics" in data
        assert "alarm_behavior" in data
        assert "user_satisfaction" in data
        assert data["user_satisfaction"]["average_star_rating"] == 5.0


class TestAdaptiveDifficultyEngineSuite:
    """
    Task 5 Verification:
    - User performance analysis
    - Difficulty adjustment across [Beginner, Easy, Medium, Hard, Expert]
    - Learning pattern analysis
    - Challenge personalization & engagement optimization
    """

    def test_20_user_performance_analysis(self):
        token = get_token()
        res = client.get("/api/ai/performance-analysis", headers={"Authorization": f"Bearer {token}"})
        assert res.status_code == 200
        data = res.json()
        assert "total_attempts" in data
        assert "overall_accuracy" in data
        assert "avg_response_time" in data
        assert "success_rate" in data
        assert "cognitive_speed_status" in data
        assert "mastery_score" in data
        assert data["total_attempts"] >= 3

    def test_21_difficulty_adjustment_levels(self):
        token = get_token()
        # Test upgrade on high performance
        res = client.get(
            "/api/ai/difficulty-adjustment?challenge_type=Math Problems&current_difficulty=Medium",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert res.status_code == 200
        data = res.json()
        assert "previous_difficulty" in data
        assert "adjusted_difficulty" in data
        assert "adjustment_action" in data
        assert data["adjusted_difficulty"] in ["Beginner", "Easy", "Medium", "Hard", "Expert"]

    def test_22_learning_patterns_analysis(self):
        token = get_token()
        res = client.get("/api/ai/learning-patterns", headers={"Authorization": f"Bearer {token}"})
        assert res.status_code == 200
        data = res.json()
        assert "learning_curve_trend" in data
        assert "accuracy_growth_pct" in data
        assert "speed_improvement_pct" in data
        assert "retention_index" in data
        assert "pattern_insights" in data
        assert len(data["pattern_insights"]) >= 1

    def test_23_engagement_optimization_endpoint(self):
        token = get_token()
        res = client.get("/api/ai/engagement-optimization", headers={"Authorization": f"Bearer {token}"})
        assert res.status_code == 200
        data = res.json()
        assert "engagement_score" in data
        assert "recommended_challenge" in data
        assert "adaptive_difficulty" in data
        assert "learning_patterns" in data
        assert "performance_metrics" in data
        assert "optimization_actions" in data
        assert data["adaptive_difficulty"] in ["Beginner", "Easy", "Medium", "Hard", "Expert"]

