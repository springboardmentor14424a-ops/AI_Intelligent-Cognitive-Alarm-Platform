import asyncio
import datetime
import logging
from sqlalchemy.orm import Session
from database import SessionLocal
from models import Alarm, User

from services.gemini_service import generate_cognitive_challenge

logger = logging.getLogger("alarm_scheduler")

triggered_alarms = []

# Mock function simulating checking user sleep/cognitive metrics for smart adaptive alarms
def check_user_wellness_metrics(db_session: Session, user_id: int):
    # In a full app, this would query user sleep logs / cognitive scores from the DB
    user = db_session.query(User).filter(User.id == user_id).first()
    if user and user.name.lower() == "john":
        return {
            "sleep_quality_score": 62, # Poor sleep (< 70)
            "sleep_hours": 5.5,        # Low sleep duration (< 6 hrs)
            "cognitive_accuracy": 68   # Low cognitive score (< 70)
        }
    # Default simulated wellness data
    return {
        "sleep_quality_score": 85,
        "sleep_hours": 7.5,
        "cognitive_accuracy": 92
    }

def evaluate_smart_adaptive_rules(alarm: Alarm, metrics: dict):
    """
    Evaluates rule-based adaptive parameters for Smart Adaptive Alarms.
    Returns:
        dict containing adjusted_time, difficulty, sound, and message detailing the rule triggered.
    """
    adjusted_time = alarm.alarm_time
    difficulty = alarm.difficulty_level
    sound = alarm.sound
    rules_applied = []

    # Rule 1: Poor sleep duration (< 6 hours) -> Delay alarm by 15 minutes to guarantee sleep recovery
    if metrics["sleep_hours"] < 6.0:
        try:
            h, m = map(int, alarm.alarm_time.split(":"))
            m += 15
            if m >= 60:
                h = (h + 1) % 24
                m -= 60
            adjusted_time = f"{h:02d}:{m:02d}"
            rules_applied.append(f"Sleep hours low ({metrics['sleep_hours']}h) -> Delayed alarm by +15 mins to {adjusted_time}")
        except Exception as e:
            logger.error(f"Error adjusting time for smart adaptive alarm: {e}")

    # Rule 2: Low cognitive score (< 70) -> Set challenge difficulty to Easy and use Forest Bird tone to mitigate sleep inertia
    if metrics["cognitive_accuracy"] < 70:
        difficulty = "Easy"
        sound = "Forest Bird"
        rules_applied.append(f"Cognitive accuracy low ({metrics['cognitive_accuracy']}%) -> Reduced difficulty to 'Easy', changed tone to 'Forest Bird'")

    # Rule 3: High sleep quality & high cognitive score -> Standby with configured settings
    if not rules_applied:
        rules_applied.append("Circadian metrics normal -> Retained standard configuration")

    return {
        "adjusted_time": adjusted_time,
        "difficulty": difficulty,
        "sound": sound,
        "rules_applied": rules_applied
    }

async def alarm_scheduler_loop():
    """
    Background loop checking active alarms every 30 seconds.
    """
    logger.info("Background Alarm Scheduler Service started.")
    triggered_cache = set()

    while True:
        try:
            db = SessionLocal()
            now = datetime.datetime.now()
            today_name = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][now.weekday()]
            today_is_weekend = now.weekday() in (5, 6)
            current_time_str = now.strftime("%H:%M")
            today_str = now.strftime("%Y-%m-%d")

            cache_to_keep = {item for item in triggered_cache if item[1] == today_str}
            triggered_cache.intersection_update(cache_to_keep)

            active_alarms = db.query(Alarm).filter(Alarm.is_active == True).all()

            for alarm in active_alarms:
                is_scheduled_today = False
                if alarm.alarm_type == "Daily":
                    is_scheduled_today = True
                elif alarm.alarm_type in {"Weekday", "Weekdays"}:
                    is_scheduled_today = not today_is_weekend
                elif alarm.alarm_type in {"Weekend", "Weekends"}:
                    is_scheduled_today = today_is_weekend
                elif alarm.alarm_type == "One-Time":
                    is_scheduled_today = True
                elif alarm.alarm_type == "Smart Adaptive":
                    is_scheduled_today = True
                else:
                    days = [d.strip() for d in alarm.repeat_days.split(",") if d.strip()]
                    is_scheduled_today = today_name in days

                if not is_scheduled_today:
                    continue

                target_time = alarm.alarm_time
                adaptive_info = None

                if alarm.alarm_type == "Smart Adaptive":
                    metrics = check_user_wellness_metrics(db, alarm.user_id)
                    adaptive_info = evaluate_smart_adaptive_rules(alarm, metrics)
                    target_time = adaptive_info["adjusted_time"]

                cache_key = (alarm.id, today_str, target_time)
                if current_time_str == target_time and cache_key not in triggered_cache:
                    triggered_cache.add(cache_key)
                    
                    diff_level = adaptive_info["difficulty"] if adaptive_info else alarm.difficulty_level
                    ch_type = alarm.challenge if (alarm.challenge and alarm.challenge.lower() != "none") else "Math Problems"
                    
                    # Generate challenge ONCE for this alarm trigger
                    logger.info(f"Generating cognitive challenge '{ch_type}' ({diff_level}) for Alarm ID {alarm.id}")
                    challenge_payload = generate_cognitive_challenge(ch_type, diff_level)

                    triggered_alarms.append({
                        "id": alarm.id,
                        "user_id": alarm.user_id,
                        "title": alarm.title,
                        "sound": adaptive_info["sound"] if adaptive_info else alarm.sound,
                        "difficulty": diff_level,
                        "time": target_time,
                        "alarm_type": alarm.alarm_type,
                        "challenge_type": ch_type,
                        "challenge": challenge_payload
                    })

                    print("\n" + "="*80)
                    print(f"[ALARM TRIGGERED] Timestamp: {now.strftime('%Y-%m-%d %H:%M:%S')}")
                    print(f"Alarm ID: {alarm.id} | User ID: {alarm.user_id} | Label: {alarm.title}")
                    print(f"Trigger Time: {target_time} (Configured: {alarm.alarm_time})")
                    print(f"Customization: Sound={alarm.sound if not adaptive_info else adaptive_info['sound']}, "
                          f"Vibration={alarm.vibration}, Difficulty={diff_level}")
                    print(f"Cognitive Challenge Generated: Type='{challenge_payload.get('type')}', Question='{challenge_payload.get('question')}'")
                    
                    if adaptive_info:
                        print("Smart Adaptive Rules Applied:")
                        for rule in adaptive_info["rules_applied"]:
                            print(f"  - {rule}")
                    print("="*80 + "\n")

                    logger.info(f"Alarm '{alarm.title}' (ID: {alarm.id}) triggered for User {alarm.user_id} at {target_time}")

            db.close()
        except Exception as e:
            logger.error(f"Error in alarm scheduler loop: {e}")

        await asyncio.sleep(30)
