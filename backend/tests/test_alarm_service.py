from datetime import datetime, time

from backend.alarm_service import (
    next_occurrence,
    parse_days,
)

from backend.gemini_service import GeminiChallengeGenerator


def test_weekday_days():
    assert parse_days("WEEKDAY", None) == {0, 1, 2, 3, 4}


def test_weekend_alarm_skips_weekday():
    result = next_occurrence(
        time(8, 0),
        "WEEKEND",
        now=datetime(2026, 8, 3, 7, 0),
    )
    assert result.weekday() == 5


def test_one_time_past_is_not_scheduled():
    assert (
        next_occurrence(
            time(7, 0),
            "ONE_TIME",
            now=datetime(2026, 8, 3, 8, 0),
        )
        is None
    )


def test_gemini_assistant_falls_back_cleanly():
    service = GeminiChallengeGenerator(api_key="")

    reply = service.generate_assistant_reply(
        "I am tired and need help waking up"
    )

    assert isinstance(reply, str)
    assert len(reply) > 20

    assert (
        "wake" in reply.lower()
        or "focus" in reply.lower()
        or "habit" in reply.lower()
    )