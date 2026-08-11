from datetime import datetime, time
from backend.alarm_service import adaptive_time, next_occurrence, parse_days

def test_weekday_days(): assert parse_days("WEEKDAY", None) == {0, 1, 2, 3, 4}
def test_adaptive_alarm_delays_low_sleep(): assert adaptive_time(time(7, 0), 55) == time(7, 20)
def test_weekend_alarm_skips_weekday():
    result = next_occurrence(time(8, 0), "WEEKEND", now=datetime(2026, 8, 3, 7, 0))
    assert result.weekday() == 5
def test_one_time_past_is_not_scheduled(): assert next_occurrence(time(7, 0), "ONE_TIME", now=datetime(2026, 8, 3, 8, 0)) is None
