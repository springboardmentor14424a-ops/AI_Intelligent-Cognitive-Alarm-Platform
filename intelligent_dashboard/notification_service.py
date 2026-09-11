

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


def send_wake_up_reminder(user_id: int, alarm_title: str = "Morning Alarm", minutes_until: int = 15, target_wake: str = "07:00", fcm_token: str = None) -> bool:
    """
    Sends wake-up reminder notification:
    Alerts user before their scheduled wake-up time to prepare circadian awakening.
    """
    title = f"⏰ Wake-Up Reminder: {alarm_title}"
    body = f"Your alarm '{alarm_title}' is scheduled for {target_wake} (in {minutes_until} minutes). Hydrate and get ready to rise!"

    if fcm_token:
        send_fcm_push(
            fcm_token=fcm_token,
            title=title,
            body=body,
            data={"type": "wake_up_reminder", "alarm_title": alarm_title, "target_wake": target_wake, "minutes_until": str(minutes_until)}
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
        logger.info(f"Wake-up reminder saved for user {user_id}: {alarm_title} ({target_wake})")
        return True
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to save wake-up reminder: {e}")
        return False
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


def send_challenge_reminder(user_id: int, challenge_type: str, fcm_token: str = None):
    """Send a cognitive puzzle practice reminder."""
    title = f"🧩 Morning Challenge Ready: {challenge_type}"
    body = f"Your daily {challenge_type} is configured. Practice your cognitive speed to clear morning inertia!"

    if fcm_token:
        send_fcm_push(
            fcm_token=fcm_token,
            title=title,
            body=body,
            data={"type": "challenge_reminder", "challenge_type": challenge_type}
        )

    db = SessionLocal()
    try:
        notif = Notification(
            user_id=user_id,
            title=title,
            message=body,
            type="challenge",
            read_status=False
        )
        db.add(notif)
        db.commit()
        return True
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to save challenge reminder: {e}")
        return False
    finally:
        db.close()


def send_habit_alert(user_id: int, alert_type: str, message: str, fcm_token: str = None):
    """Send habit warnings (e.g. broken streak risk, snooze penalty)."""
    title = f"⚡ Habit Alert: {alert_type}"
    body = message

    if fcm_token:
        send_fcm_push(
            fcm_token=fcm_token,
            title=title,
            body=body,
            data={"type": "habit_alert", "alert_type": alert_type}
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
        return True
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to save habit alert: {e}")
        return False
    finally:
        db.close()


def broadcast_platform_announcement(title: str, content: str, target_role: str = "all", priority: str = "normal", admin_id: int = None, db = None):
    """
    Broadcasts a platform announcement to users/coaches and saves Announcement + in-app Notifications.
    """
    from database import User, Announcement
    created_internally = False
    if db is None:
        db = SessionLocal()
        created_internally = True
    try:
        # Create Announcement record
        ann = Announcement(
            admin_id=admin_id,
            title=title,
            content=content,
            target_role=target_role,
            priority=priority
        )
        db.add(ann)
        db.commit()

        # Query recipients
        query = db.query(User)
        if target_role != "all":
            query = query.filter(User.role == target_role)
        recipients = query.all()

        for u in recipients:
            notif = Notification(
                user_id=u.id,
                title=f"📢 Announcement: {title}",
                message=content,
                type="announcement",
                read_status=False
            )
            db.add(notif)
            if u.fcm_token:
                send_fcm_push(
                    fcm_token=u.fcm_token,
                    title=f"📢 {title}",
                    body=content,
                    data={"type": "announcement", "priority": priority}
                )
        db.commit()
        logger.info(f"Broadcasted announcement '{title}' to {len(recipients)} recipients.")
        return {"success": True, "recipients_count": len(recipients)}
    except Exception as e:
        db.rollback()
        logger.error(f"Broadcast failed: {e}")
        return {"success": False, "error": str(e)}
    finally:
        if created_internally:
            db.close()


