# ==============================================================================
# ALARM SCHEDULER SERVICE
# Uses APScheduler to run recurring background jobs that:
#   1. Check which alarms should fire every minute
#   2. Send FCM push + in-app notifications
#   3. Apply Smart Adaptive rule-based adjustments
#   4. Handle all alarm types: Daily, Weekday, Weekend, One-Time, Smart Adaptive
# ==============================================================================

import datetime
import logging
from typing import Optional

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger
from apscheduler.events import EVENT_JOB_ERROR, EVENT_JOB_EXECUTED

from database import SessionLocal, Alarm, User, UserProfile, ActivityLog
from notification_service import send_alarm_notification, send_upcoming_reminder

logger = logging.getLogger(__name__)

# Global scheduler instance (singleton)
_scheduler: Optional[BackgroundScheduler] = None


# ==============================================================================
# SMART ADAPTIVE ALARM RULES ENGINE
# ==============================================================================

def apply_smart_adaptive_rules(alarm: Alarm, profile: Optional[UserProfile]) -> str:
    """
    Rule-based engine that adjusts the alarm trigger time.

    Rules applied in order:
      1. Low habit score (<40) -> wake 15 min earlier (circadian recovery)
      2. High streak (>10 days) -> keep scheduled time (optimal routine locked)
      3. Very high habit score (>85) -> allow 10 min buffer (reward)
      4. One-Time alarm -> always use exact time, no adjustment
      5. Default -> return scheduled time unchanged
    """
    if not profile or alarm.alarm_type == "One-Time" or not alarm.smart_alarm:
        return alarm.alarm_time

    h, m = map(int, alarm.alarm_time.split(":"))
    total_mins = h * 60 + m

    if profile.habit_score < 40:
        # Low score: shift 15 min earlier for circadian alignment
        total_mins = max(0, total_mins - 15)
        reason = "Low habit score — shifted 15m earlier"
    elif profile.streak > 10:
        # High streak: keep exact time (optimal routine)
        reason = "High streak — optimal window maintained"
        return alarm.alarm_time
    elif profile.habit_score > 85:
        # Reward: 10 min extra buffer
        total_mins = total_mins + 10
        reason = "High habit score — +10m buffer reward"
    else:
        return alarm.alarm_time

    adj_h, adj_m = divmod(total_mins % 1440, 60)
    adjusted = f"{adj_h:02d}:{adj_m:02d}"
    logger.info(f"Smart Adaptive: Alarm '{alarm.alarm_name}' adjusted {alarm.alarm_time} -> {adjusted} ({reason})")
    return adjusted


# ==============================================================================
# ALARM TYPE ACTIVE-DAY CHECKER
# ==============================================================================

def is_alarm_active_today(alarm: Alarm) -> bool:
    """
    Returns True if this alarm should fire today based on its type and repeat_days.
    Alarm Types:
      - Daily         : fires every day
      - Weekday       : fires Mon-Fri
      - Weekend       : fires Sat-Sun
      - One-Time      : fires once on any day (scheduler disables after firing)
      - Smart Adaptive: fires on repeat_days, applies rule-based time adjustment
    """
    today = datetime.datetime.now().weekday()  # 0=Mon ... 6=Sun
    day_map = {"Mon": 0, "Tue": 1, "Wed": 2, "Thu": 3, "Fri": 4, "Sat": 5, "Sun": 6}
    alarm_type = (alarm.alarm_type or "Daily").strip()

    if alarm_type == "Daily":
        return True
    elif alarm_type == "Weekday":
        return today < 5  # Mon-Fri
    elif alarm_type == "Weekend":
        return today >= 5  # Sat-Sun
    elif alarm_type == "One-Time":
        return True  # Fire once, then disable
    elif alarm_type in ("Smart Adaptive", "smart adaptive"):
        # Use repeat_days field
        if alarm.repeat_days:
            active_days = [day_map[d.strip()] for d in alarm.repeat_days.split(",") if d.strip() in day_map]
            return today in active_days
        return True  # Default: every day
    else:
        # Custom repeat_days fallback
        if alarm.repeat_days:
            active_days = [day_map[d.strip()] for d in alarm.repeat_days.split(",") if d.strip() in day_map]
            return today in active_days
        return True


# ==============================================================================
# CORE SCHEDULER JOB — runs every minute
# ==============================================================================

def check_and_fire_alarms():
    """
    Scheduled job — runs every minute.
    Checks all active alarms against current time and fires notifications.
    """
    now = datetime.datetime.now()
    current_time_str = now.strftime("%H:%M")

    db = SessionLocal()
    try:
        # Fetch all active alarms
        active_alarms = db.query(Alarm).filter(Alarm.alarm_status == True).all()

        for alarm in active_alarms:
            # 1. Check if alarm is scheduled for today
            if not is_alarm_active_today(alarm):
                continue

            # 2. Get user profile for Smart Adaptive rules
            user = db.query(User).filter(User.id == alarm.user_id).first()
            if not user:
                continue
            profile = user.profile

            # 3. Apply Smart Adaptive rule-based time adjustment
            effective_time = apply_smart_adaptive_rules(alarm, profile)

            # 4. Check if current time matches alarm time (HH:MM)
            if current_time_str != effective_time:
                continue

            # 5. FIRE THE ALARM
            logger.info(f"ALARM FIRED: '{alarm.alarm_name}' for user {alarm.user_id} at {effective_time}")

            # Get FCM token from user profile if available
            fcm_token = getattr(user, "fcm_token", None)

            # Send notification (FCM + in-app DB)
            send_alarm_notification(
                user_id=alarm.user_id,
                alarm_title=alarm.alarm_name,
                alarm_time=effective_time,
                fcm_token=fcm_token
            )

            # Log to activity log
            log = ActivityLog(
                user_id=alarm.user_id,
                action="Alarm Fired",
                details=f"Alarm '{alarm.alarm_name}' fired at {effective_time}"
            )
            db.add(log)

            # For One-Time alarms: auto-disable after firing
            if alarm.alarm_type == "One-Time":
                alarm.alarm_status = False
                logger.info(f"One-Time alarm '{alarm.alarm_name}' auto-disabled after firing.")

            db.commit()

    except Exception as e:
        logger.error(f"Scheduler job error in check_and_fire_alarms: {e}")
        db.rollback()
    finally:
        db.close()


def send_15min_reminders():
    """
    Scheduled job — runs every minute.
    Sends pre-alarm reminders 15 minutes before wake time.
    """
    now = datetime.datetime.now()
    reminder_time = (now + datetime.timedelta(minutes=15)).strftime("%H:%M")

    db = SessionLocal()
    try:
        active_alarms = db.query(Alarm).filter(Alarm.alarm_status == True).all()

        for alarm in active_alarms:
            if not is_alarm_active_today(alarm):
                continue

            user = db.query(User).filter(User.id == alarm.user_id).first()
            if not user:
                continue

            profile = user.profile
            effective_time = apply_smart_adaptive_rules(alarm, profile)

            if reminder_time == effective_time:
                fcm_token = getattr(user, "fcm_token", None)
                send_upcoming_reminder(
                    user_id=alarm.user_id,
                    alarm_title=alarm.alarm_name,
                    minutes_until=15,
                    fcm_token=fcm_token
                )
                logger.info(f"15-min reminder sent for alarm '{alarm.alarm_name}' user {alarm.user_id}")

    except Exception as e:
        logger.error(f"Reminder scheduler error: {e}")
    finally:
        db.close()


# ==============================================================================
# SCHEDULER LIFECYCLE
# ==============================================================================

def _on_scheduler_event(event):
    if event.exception:
        logger.error(f"Scheduler job {event.job_id} raised an exception: {event.exception}")


def start_scheduler() -> BackgroundScheduler:
    """
    Initialize and start the APScheduler BackgroundScheduler.
    Jobs:
      - check_and_fire_alarms : every 1 minute (CronTrigger)
      - send_15min_reminders  : every 1 minute (CronTrigger)

    Called once on FastAPI startup via lifespan event handler.
    """
    global _scheduler

    if _scheduler and _scheduler.running:
        logger.info("Scheduler already running — skipping re-init.")
        return _scheduler

    _scheduler = BackgroundScheduler(
        job_defaults={"coalesce": True, "max_instances": 1, "misfire_grace_time": 30},
        timezone="UTC"
    )

    # Job 1: Check & fire alarms every minute
    _scheduler.add_job(
        check_and_fire_alarms,
        CronTrigger(minute="*"),          # Every minute, e.g., 06:00, 06:01 ...
        id="alarm_check_job",
        name="Alarm Fire Checker",
        replace_existing=True
    )

    # Job 2: Send 15-min pre-alarm reminders every minute
    _scheduler.add_job(
        send_15min_reminders,
        CronTrigger(minute="*"),
        id="reminder_job",
        name="15-Min Reminder Sender",
        replace_existing=True
    )

    # Listen for job errors
    _scheduler.add_listener(_on_scheduler_event, EVENT_JOB_ERROR | EVENT_JOB_EXECUTED)

    _scheduler.start()
    logger.info("APScheduler started — alarm jobs running every minute.")
    return _scheduler


def stop_scheduler():
    """Gracefully stop the scheduler on app shutdown."""
    global _scheduler
    if _scheduler and _scheduler.running:
        _scheduler.shutdown(wait=False)
        logger.info("APScheduler stopped gracefully.")


def get_scheduler_status() -> dict:
    """Returns current scheduler status and active job list."""
    global _scheduler
    if not _scheduler or not _scheduler.running:
        return {"running": False, "jobs": []}

    jobs = []
    for job in _scheduler.get_jobs():
        next_run = job.next_run_time
        jobs.append({
            "id": job.id,
            "name": job.name,
            "next_run": next_run.isoformat() if next_run else None
        })

    return {"running": True, "jobs": jobs}
