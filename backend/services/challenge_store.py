import threading
from typing import Dict, Optional

# Session store for active challenge sessions
# Key: session_id -> value: dict with challenge payload and metadata
_lock = threading.Lock()
ACTIVE_CHALLENGE_SESSIONS: Dict[str, dict] = {}

def add_session(session_id: str, session_data: dict) -> None:
    with _lock:
        ACTIVE_CHALLENGE_SESSIONS[session_id] = session_data

def get_session(session_id: str) -> Optional[dict]:
    with _lock:
        return ACTIVE_CHALLENGE_SESSIONS.get(session_id)

def remove_session(session_id: str) -> None:
    with _lock:
        if session_id in ACTIVE_CHALLENGE_SESSIONS:
            del ACTIVE_CHALLENGE_SESSIONS[session_id]

def find_session_by_alarm(alarm_id: int, user_id: int) -> Optional[dict]:
    with _lock:
        for sid, s in ACTIVE_CHALLENGE_SESSIONS.items():
            if s.get("alarm_id") == alarm_id and s.get("user_id") == user_id:
                return s
    return None
