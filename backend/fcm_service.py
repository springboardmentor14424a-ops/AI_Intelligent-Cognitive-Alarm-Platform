"""Firebase Cloud Messaging push notifications with a safe no-op fallback.

Mirrors the optional-service pattern used by gemini_service.py: when Firebase
credentials are not configured, every call becomes a harmless no-op instead of
raising, so the rest of the notification pipeline (in-app records) keeps working.
"""
import json
import logging
import os
from typing import Optional

try:
    import firebase_admin
    from firebase_admin import credentials, messaging
except ImportError:
    firebase_admin = None
    credentials = None
    messaging = None

logger = logging.getLogger(__name__)


class FCMPushService:
    """Send push notifications via Firebase Cloud Messaging, or no-op if unconfigured."""

    def __init__(self):
        self.enabled = False
        self._app = None

        if firebase_admin is None:
            logger.info("firebase-admin not installed - push notifications disabled (in-app notifications still work).")
            return

        credentials_json = os.getenv("FIREBASE_CREDENTIALS_JSON", "")
        credentials_path = os.getenv("FIREBASE_CREDENTIALS_PATH", "")

        try:
            if credentials_json:
                cred = credentials.Certificate(json.loads(credentials_json))
            elif credentials_path and os.path.exists(credentials_path):
                cred = credentials.Certificate(credentials_path)
            else:
                logger.info("FIREBASE_CREDENTIALS_JSON/PATH not set - push notifications disabled.")
                return
            self._app = firebase_admin.initialize_app(cred, name="brainos-fcm")
            self.enabled = True
            logger.info("Firebase Cloud Messaging initialized.")
        except Exception as exc:
            logger.error("Failed to initialize Firebase Cloud Messaging: %s", exc)
            self.enabled = False

    def send(self, tokens: list[str], title: str, body: str, data: Optional[dict] = None) -> dict:
        """Push a notification to each device token. Returns a delivery summary."""
        tokens = [token for token in (tokens or []) if token]
        if not self.enabled or not tokens:
            return {"sent": 0, "failed": 0, "skipped": True}

        string_data = {str(key): str(value) for key, value in (data or {}).items()}
        message = messaging.MulticastMessage(
            notification=messaging.Notification(title=title, body=body),
            data=string_data,
            tokens=tokens,
        )
        try:
            response = messaging.send_each_for_multicast(message, app=self._app)
            return {"sent": response.success_count, "failed": response.failure_count, "skipped": False}
        except Exception as exc:
            logger.warning("FCM push failed: %s", exc)
            return {"sent": 0, "failed": len(tokens), "skipped": False}


_fcm_service: Optional[FCMPushService] = None


def get_fcm_service() -> FCMPushService:
    global _fcm_service
    if _fcm_service is None:
        _fcm_service = FCMPushService()
    return _fcm_service


def is_fcm_enabled() -> bool:
    return get_fcm_service().enabled
