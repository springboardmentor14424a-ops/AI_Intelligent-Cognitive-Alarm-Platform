from datetime import date, datetime, time, timedelta

WEEKDAYS = {"MON": 0, "TUE": 1, "WED": 2, "THU": 3, "FRI": 4, "SAT": 5, "SUN": 6}

def parse_days(alarm_type: str, repeat_days: str | None) -> set[int]:
    kind = alarm_type.upper()
    if kind == "WEEKDAY": return {0, 1, 2, 3, 4}
    if kind == "WEEKEND": return {5, 6}
    if kind in {"DAILY", "SMART_ADAPTIVE"}: return set(range(7))
    return {WEEKDAYS[d.strip().upper()[:3]] for d in (repeat_days or "").split(",") if d.strip().upper()[:3] in WEEKDAYS}

def adaptive_time(base: time, sleep_score: int | None) -> time:
    """Move a smart alarm up to 20 min later after a low recovery score."""
    offset = 20 if sleep_score is not None and sleep_score < 60 else 10 if sleep_score is not None and sleep_score < 75 else 0
    return (datetime.combine(date.today(), base) + timedelta(minutes=offset)).time()

def next_occurrence(alarm_time: time, alarm_type: str, repeat_days: str | None = None, sleep_score: int | None = None, now: datetime | None = None) -> datetime | None:
    now = now or datetime.now()
    if alarm_type.upper() == "SMART_ADAPTIVE": alarm_time = adaptive_time(alarm_time, sleep_score)
    today = now.date()
    if alarm_type.upper() == "ONE_TIME":
        candidate = datetime.combine(today, alarm_time)
        return candidate if candidate > now else None
    days = parse_days(alarm_type, repeat_days)
    for offset in range(8):
        candidate = datetime.combine(today + timedelta(days=offset), alarm_time)
        if candidate.weekday() in days and candidate > now: return candidate
    return None
