from datetime import datetime, time, timedelta

from backend.alarm_service import adaptive_time, next_occurrence, next_occurrence_after_snooze, parse_days
from backend.gemini_service import GeminiChallengeGenerator


def test_weekday_days(): assert parse_days("WEEKDAY", None) == {0, 1, 2, 3, 4}
def test_adaptive_alarm_delays_low_sleep(): assert adaptive_time(time(7, 0), 55) == time(7, 20)
def test_weekend_alarm_skips_weekday():
    result = next_occurrence(time(8, 0), "WEEKEND", now=datetime(2026, 8, 3, 7, 0))
    assert result.weekday() == 5
def test_one_time_past_is_not_scheduled(): assert next_occurrence(time(7, 0), "ONE_TIME", now=datetime(2026, 8, 3, 8, 0)) is None

def test_snoozed_alarm_moves_to_next_valid_occurrence():
    now = datetime(2026, 8, 3, 6, 58)
    result = next_occurrence_after_snooze(time(7, 0), "DAILY", now=now, snoozed_until=now + timedelta(minutes=5))
    assert result == datetime(2026, 8, 3, 7, 3)


def test_gemini_assistant_falls_back_cleanly():
    service = GeminiChallengeGenerator(api_key="")
    reply = service.generate_assistant_reply("I am tired and need help waking up")
    assert isinstance(reply, str)
    assert len(reply) > 20
    assert "wake" in reply.lower() or "focus" in reply.lower() or "habit" in reply.lower()
