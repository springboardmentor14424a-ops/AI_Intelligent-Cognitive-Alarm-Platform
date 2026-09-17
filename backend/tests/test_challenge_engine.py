from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.main import (
    Base,
    CHALLENGE_TYPES,
    ChallengeAttempt,
    DIFFICULTY_LEVELS,
    User,
    UserProfile,
    challenge_max_attempts,
    challenge_metrics,
    challenge_time_limit,
    choose_challenge_difficulty,
    deterministic_challenge,
    normalize_challenge_type,
    normalize_difficulty,
    recent_completed_challenges,
)


@pytest.fixture()
def db_session():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)
    db = Session()
    try:
        yield db
    finally:
        db.close()
        engine.dispose()


def make_user(db, email="user@example.com"):
    user = User(name="Test User", email=email, password="hash", role="USER", provider="LOCAL")
    db.add(user)
    db.flush()
    profile = UserProfile(user_id=user.id, difficulty_preference="MEDIUM")
    db.add(profile)
    db.flush()
    return user, profile


def make_attempt(db, user_id, *, difficulty="MEDIUM", correct, elapsed_seconds, time_limit=75, challenge_type="MATH", completed_at=None):
    attempt = ChallengeAttempt(
        user_id=user_id,
        challenge_type=challenge_type,
        difficulty=difficulty,
        intent="WAKE_UP",
        prompt="prompt",
        expected_answer="1",
        submitted_answer="1" if correct else "2",
        status="SOLVED" if correct else "FAILED",
        completed=True,
        is_correct=correct,
        elapsed_seconds=elapsed_seconds,
        time_limit_seconds=time_limit,
        attempt_count=1,
        failed_attempts=0 if correct else 1,
        completed_at=completed_at or datetime.now(timezone.utc),
    )
    db.add(attempt)
    db.flush()
    return attempt


# --- Deterministic challenge generation (Module 4) ---

@pytest.mark.parametrize("challenge_type", CHALLENGE_TYPES)
@pytest.mark.parametrize("difficulty", DIFFICULTY_LEVELS)
def test_deterministic_challenge_produces_prompt_answer_instructions(challenge_type, difficulty):
    prompt, answer, instructions = deterministic_challenge(challenge_type, difficulty, "WAKE_UP", nonce="abc")
    assert prompt and answer and instructions


def test_deterministic_challenge_is_reproducible_for_same_nonce():
    first = deterministic_challenge("MATH", "MEDIUM", "WAKE_UP", nonce="fixed")
    second = deterministic_challenge("MATH", "MEDIUM", "WAKE_UP", nonce="fixed")
    assert first == second


def test_deterministic_challenge_varies_with_nonce():
    first = deterministic_challenge("MATH", "MEDIUM", "WAKE_UP", nonce="a")
    second = deterministic_challenge("MATH", "MEDIUM", "WAKE_UP", nonce="b")
    assert first != second


def test_normalize_challenge_type_maps_aliases():
    assert normalize_challenge_type("MATH_PROBLEM") == "MATH"
    assert normalize_challenge_type("logic_puzzle") == "LOGIC"
    assert normalize_challenge_type("Riddles") == "RIDDLE"


def test_normalize_difficulty_maps_aliases_and_rejects_invalid():
    assert normalize_difficulty("novice") == "BEGINNER"
    assert normalize_difficulty("advanced") == "HARD"
    with pytest.raises(Exception):
        normalize_difficulty("nonsense")


# --- Anti-snooze / verification tightening (Module 6) ---

def test_max_attempts_tighten_as_difficulty_increases():
    values = [challenge_max_attempts(level) for level in DIFFICULTY_LEVELS]
    assert values == sorted(values, reverse=True)
    assert challenge_max_attempts("EXPERT") == 1


def test_time_limit_shortens_as_difficulty_increases():
    values = [challenge_time_limit(level) for level in DIFFICULTY_LEVELS]
    assert values == sorted(values, reverse=True)


# --- Adaptive Difficulty Engine (Module 5) ---

def test_adaptive_difficulty_defaults_to_preference_without_history(db_session):
    user, profile = make_user(db_session)
    chosen, reason = choose_challenge_difficulty(profile, user.id, "MATH", None, db_session)
    assert chosen == "MEDIUM"
    assert "preference" in reason


def test_adaptive_difficulty_increases_after_strong_performance(db_session):
    user, profile = make_user(db_session)
    for _ in range(4):
        make_attempt(db_session, user.id, correct=True, elapsed_seconds=15, time_limit=75)
    chosen, reason = choose_challenge_difficulty(profile, user.id, "MATH", None, db_session)
    assert chosen == "HARD"
    assert "increased difficulty" in reason


def test_adaptive_difficulty_decreases_after_struggling(db_session):
    user, profile = make_user(db_session)
    for _ in range(3):
        make_attempt(db_session, user.id, correct=False, elapsed_seconds=70, time_limit=75)
    chosen, reason = choose_challenge_difficulty(profile, user.id, "MATH", None, db_session)
    assert chosen == "EASY"
    assert "reduced difficulty" in reason


def test_adaptive_difficulty_respects_explicit_user_choice(db_session):
    user, profile = make_user(db_session)
    for _ in range(4):
        make_attempt(db_session, user.id, correct=True, elapsed_seconds=15, time_limit=75)
    chosen, reason = choose_challenge_difficulty(profile, user.id, "MATH", "EASY", db_session)
    assert chosen == "EASY"
    assert "selected" in reason


def test_adaptive_difficulty_caps_at_expert(db_session):
    user, profile = make_user(db_session, email="expert@example.com")
    profile.difficulty_preference = "EXPERT"
    db_session.flush()
    for _ in range(4):
        make_attempt(db_session, user.id, difficulty="EXPERT", correct=True, elapsed_seconds=10, time_limit=45)
    chosen, _ = choose_challenge_difficulty(profile, user.id, "MATH", None, db_session)
    assert chosen == "EXPERT"


def test_challenge_metrics_accuracy_and_failure_streak(db_session):
    user, _ = make_user(db_session)
    now = datetime.now(timezone.utc)
    make_attempt(db_session, user.id, correct=True, elapsed_seconds=20, completed_at=now - timedelta(minutes=3))
    make_attempt(db_session, user.id, correct=False, elapsed_seconds=70, completed_at=now - timedelta(minutes=2))
    make_attempt(db_session, user.id, correct=False, elapsed_seconds=70, completed_at=now - timedelta(minutes=1))
    attempts = recent_completed_challenges(user.id, db_session)
    metrics = challenge_metrics(attempts)
    assert metrics["accuracy"] == pytest.approx(1 / 3)
    assert metrics["failure_streak"] == 2
