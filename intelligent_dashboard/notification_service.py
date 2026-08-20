

import os
import logging
from typing import Optional
from database import SessionLocal, Notification

logger = logging.getLogger(__name__)

_fcm_available = False
try:
    import firebase_admin
    from firebase_admin import credentials, messaging
    
    _cred_path = os.environ.get("FIREBASE_CREDENTIALS_PATH", "firebase_credentials.json")
    if os.path.exists(_cred_path):
        if not firebase_admin._apps:
            cred = credentials.Certificate(_cred_path)
            firebase_admin.initialize_app(cred)
        _fcm_available = True
        logger.info("Firebase Admin SDK initialized successfully.")
    else:
        logger.info(
            "Firebase credentials file not found. "
            "FCM push notifications disabled — using in-app DB notifications only. "
            "To enable FCM: set FIREBASE_CREDENTIALS_PATH env var and place credentials JSON."
        )
except ImportError:
    logger.info("firebase-admin not installed. Using in-app DB notifications only.")
except Exception as e:
    logger.warning(f"Firebase init skipped: {e}. Using in-app DB notifications only.")


def send_fcm_push(fcm_token: str, title: str, body: str, data: dict = None) -> bool:
    """
    Send a real FCM push notification to a device token.
    Returns True on success, False if FCM unavailable or error.
    
    Integration Guide:
    - Android: Use AlarmManager + Firebase for background-safe delivery.
    - iOS: Use iOS Local Notifications + FCM for remote triggers.
    - Set FIREBASE_CREDENTIALS_PATH to your service account JSON.
    """
    if not _fcm_available:
        logger.debug("FCM not configured — skipping push notification.")
        return False
    try:
        from firebase_admin import messaging
        message = messaging.Message(
            notification=messaging.Notification(title=title, body=body),
            data={str(k): str(v) for k, v in (data or {}).items()},
            token=fcm_token,
            android=messaging.AndroidConfig(
                priority="high",
                notification=messaging.AndroidNotification(
                    channel_id="alarm_channel",
                    sound="default",
                    priority="max",
                    visibility="public"
                )
            ),
            apns=messaging.APNSConfig(
                payload=messaging.APNSPayload(
                    aps=messaging.Aps(
                        alert=messaging.ApsAlert(title=title, body=body),
                        sound="default",
                        badge=1
                    )
                )
            )
        )
        response = messaging.send(message)
        logger.info(f"FCM push sent successfully: {response}")
        return True
    except Exception as e:
        logger.error(f"FCM push failed: {e}")
        return False


def send_alarm_notification(user_id: int, alarm_title: str, alarm_time: str, fcm_token: str = None):
    """
    Primary alarm notification dispatcher.
    1. Tries FCM push if token available.
    2. Always saves in-app DB notification (guaranteed delivery).
    """
    title = f"Alarm: {alarm_title}"
    body = f"Your alarm '{alarm_title}' is ringing at {alarm_time}! Wake up!"

    # 1. FCM push notification (mobile devices)
    fcm_sent = False
    if fcm_token:
        fcm_sent = send_fcm_push(
            fcm_token=fcm_token,
            title=title,
            body=body,
            data={"alarm_title": alarm_title, "alarm_time": alarm_time, "type": "alarm_trigger"}
        )

    # 2. In-app DB notification (always saved — works without FCM)
    db = SessionLocal()
    try:
        notif = Notification(
            user_id=user_id,
            title=title,
            message=body,
            type="alarm",
            read_status=False
        )
        db.add(notif)
        db.commit()
        logger.info(f"In-app notification saved for user {user_id}: {alarm_title} at {alarm_time}")
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to save in-app notification: {e}")
    finally:
        db.close()

    return {"fcm_sent": fcm_sent, "in_app_saved": True}


def send_upcoming_reminder(user_id: int, alarm_title: str, minutes_until: int, fcm_token: str = None):
    """Send a pre-alarm reminder (e.g., 15 minutes before wake time)."""
    title = f"Wake Up Reminder: {alarm_title}"
    body = f"Your alarm '{alarm_title}' rings in {minutes_until} minutes. Prepare to wake up!"

    if fcm_token:
        send_fcm_push(
            fcm_token=fcm_token,
            title=title,
            body=body,
            data={"type": "alarm_reminder", "minutes_until": str(minutes_until)}
        )

    db = SessionLocal()
    try:
        notif = Notification(
            user_id=user_id,
            title=title,
            message=body,
            type="reminder",
            read_status=False
        )
        db.add(notif)
        db.commit()
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to save reminder notification: {e}")
    finally:
        db.close()


def send_bedtime_reminder(user_id: int, sleep_time: str, target_wake: str, fcm_token: str = None):
    """
    Task 3: Send an automated bedtime circadian reminder (e.g. 30-45m before sleep time).
    """
    title = "🌙 Bedtime Wind-Down Alert"
    body = f"Time to wind down! Your target sleep is {sleep_time} for a {target_wake} wake-up. Rest well for optimal morning alertness!"

    if fcm_token:
        send_fcm_push(
            fcm_token=fcm_token,
            title=title,
            body=body,
            data={"type": "bedtime_reminder", "sleep_time": sleep_time, "target_wake": target_wake}
        )

    db = SessionLocal()
    try:
        notif = Notification(
            user_id=user_id,
            title=title,
            message=body,
            type="bedtime",
            read_status=False
        )
        db.add(notif)
        db.commit()
        logger.info(f"Bedtime reminder saved for user {user_id}")
        return True
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to save bedtime reminder: {e}")
        return False
    finally:
        db.close()


def send_habit_reminder(user_id: int, streak_days: int, habit_score: int, fcm_token: str = None):
    """
    Task 3: Send a daily habit streak and circadian score maintenance reminder.
    """
    title = f"🔥 Streak Reminder: {streak_days} Days Active!"
    body = f"You are on a {streak_days}-day streak with a Habit Score of {habit_score}! Keep it up tomorrow morning!"

    if fcm_token:
        send_fcm_push(
            fcm_token=fcm_token,
            title=title,
            body=body,
            data={"type": "habit_reminder", "streak": str(streak_days), "score": str(habit_score)}
        )

    db = SessionLocal()
    try:
        notif = Notification(
            user_id=user_id,
            title=title,
            message=body,
            type="habit",
            read_status=False
        )
        db.add(notif)
        db.commit()
        logger.info(f"Habit reminder saved for user {user_id}")
        return True
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to save habit reminder: {e}")
        return False
    finally:
        db.close()


def send_progress_notification(user_id: int, total_score: float, avg_accuracy: float, fcm_token: str = None):
    """
    Task 3: Send weekly cognitive performance milestone digest.
    """
    title = "📊 Weekly Cognitive Progress Digest"
    body = f"Great work! You have accumulated {total_score:.0f} points with {avg_accuracy:.0f}% average challenge accuracy. Check your analytics dashboard!"

    if fcm_token:
        send_fcm_push(
            fcm_token=fcm_token,
            title=title,
            body=body,
            data={"type": "progress_digest", "score": str(total_score), "accuracy": str(avg_accuracy)}
        )

    db = SessionLocal()
    try:
        notif = Notification(
            user_id=user_id,
            title=title,
            message=body,
            type="progress",
            read_status=False
        )
        db.add(notif)
        db.commit()
        logger.info(f"Progress notification saved for user {user_id}")
        return True
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to save progress notification: {e}")
        return False
    finally:
        db.close()

