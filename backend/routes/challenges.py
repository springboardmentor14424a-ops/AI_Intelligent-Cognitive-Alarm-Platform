import uuid
import logging
from typing import Dict, Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from sqlalchemy import desc

from database import get_db
from models import ChallengeAttempt, User, Alarm
from schemas import (
    ChallengeTypesResponse,
    ChallengeResponse,
    ChallengeValidateRequest,
    ChallengeValidateResponse,
    ChallengeAttemptResponse,
    UserPerformanceResponse
)
from services.gemini_service import (
    generate_cognitive_challenge,
    ALLOWED_TYPES,
    map_challenge_type
)
from services.challenge_store import (
    add_session,
    get_session as get_challenge_session,
    remove_session as remove_challenge_session,
    find_session_by_alarm
)
from services.personalization_service import (
    calculate_personalized_difficulty,
    get_adaptive_recommendation,
    get_time_limit_for_difficulty,
    step_difficulty,
    normalize_difficulty,
    DIFFICULTY_LEVELS
)
from routes.auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/challenges", tags=["Cognitive Challenges"])

oauth2_scheme_optional = OAuth2PasswordBearer(tokenUrl="api/auth/login", auto_error=False)

def get_optional_user(token: Optional[str] = Depends(oauth2_scheme_optional), db: Session = Depends(get_db)) -> Optional[User]:
    if not token:
        return None
    try:
        return get_current_user(token=token, db=db)
    except Exception:
        return None

@router.get("/types", response_model=ChallengeTypesResponse)
def get_challenge_types():
    """
    Returns supported cognitive challenge types and difficulty levels.
    """
    return ChallengeTypesResponse(
        challenge_types=ALLOWED_TYPES,
        difficulty_levels=DIFFICULTY_LEVELS
    )

@router.get("/generate", response_model=ChallengeResponse)
def generate_challenge(
    challenge_type: str = Query(..., description="Challenge type (e.g. Math Problems, Logic Puzzles, etc.)"),
    difficulty: Optional[str] = Query(None, description="Difficulty level (Beginner, Easy, Medium, Hard, Expert)"),
    alarm_id: Optional[int] = Query(None, description="Associated Alarm ID"),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """
    Generates a dynamic cognitive challenge via Gemini API (or local fallback).
    Applies user personalization if authenticated, assigns time limit based on difficulty, and returns challenge structure.
    """
    valid_raw_types = {t.lower() for t in ALLOWED_TYPES} | {"math", "logic", "memory", "word", "pattern", "riddle", "quiz", "tap", "none"}
    
    if not challenge_type or challenge_type.strip().lower() not in valid_raw_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid challenge_type '{challenge_type}'. Must be one of: {', '.join(ALLOWED_TYPES)}"
        )

    base_diff = normalize_difficulty(difficulty) if difficulty else "Medium"
    adaptive_reason = None
    pref_type = challenge_type

    # 1. Personalization: If caller explicitly provided difficulty, honor it.
    #    Otherwise, compute personalized recommendation from Adaptive Engine.
    if current_user:
        rec = get_adaptive_recommendation(
            db=db,
            user_id=current_user.id,
            base_difficulty=base_diff,
            preferred_type=challenge_type
        )
        recommended_diff = rec["recommended_difficulty"] if not difficulty else base_diff
        pref_type = rec["recommended_challenge_type"] if challenge_type.lower() in ("none", "") else challenge_type
        adaptive_reason = rec["reason"]
    else:
        recommended_diff = base_diff
        adaptive_reason = f"Standard baseline difficulty: {recommended_diff}."

    normalized_type = map_challenge_type(pref_type)

    # 2. If this request is for an alarm and an active session already exists, return it.
    if alarm_id:
        if current_user:
            existing = find_session_by_alarm(alarm_id, current_user.id)
            if existing:
                return ChallengeResponse(**existing)
        else:
            try:
                alarm_obj = db.query(Alarm).filter(Alarm.id == alarm_id).first()
                if alarm_obj:
                    existing = find_session_by_alarm(alarm_id, alarm_obj.user_id)
                    if existing:
                        return ChallengeResponse(**existing)
            except Exception:
                logger.debug("Could not resolve alarm owner for alarm_id lookup")

    # 3. Call Gemini Service (or local fallback)
    challenge_data = generate_cognitive_challenge(normalized_type, recommended_diff)

    # 4. Generate session ID and store server-side
    session_id = f"chal_{uuid.uuid4().hex[:12]}"
    challenge_data["id"] = session_id
    challenge_data["recommended_difficulty"] = recommended_diff
    challenge_data["recommended_challenge_type"] = pref_type
    challenge_data["adaptive_reason"] = adaptive_reason
    challenge_data["alarm_id"] = alarm_id
    challenge_data["time_limit"] = get_time_limit_for_difficulty(recommended_diff)

    # Persist session in central store
    add_session(session_id, challenge_data)

    return ChallengeResponse(**challenge_data)

def normalize_answer(ans: str) -> str:
    """Helper to clean and normalize answer strings for validation."""
    if not ans:
        return ""
    clean = ans.strip().lower()
    for prefix in ["a ", "an ", "the "]:
        if clean.startswith(prefix):
            clean = clean[len(prefix):].strip()
    return clean

@router.post("/validate", response_model=ChallengeValidateResponse)
def validate_challenge(
    payload: ChallengeValidateRequest,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """
    Validates user's challenge answer or handles timeout, records attempt in DB, and returns updated personalization.
    """
    user_ans = normalize_answer(payload.user_answer)
    correct_ans = ""
    explanation = ""
    ch_type = payload.challenge_type or "Math Problems"
    diff = normalize_difficulty(payload.difficulty or "Medium")
    question_text = payload.question or "Challenge question"

    # 1. Lookup session details if session ID is provided (user-scoped)
    session_data = None
    if payload.challenge_id:
        session_data = get_challenge_session(payload.challenge_id)
        if session_data:
            sess_user = session_data.get("user_id")
            if current_user:
                if sess_user != current_user.id:
                    session_data = None
            else:
                if sess_user != 1:
                    session_data = None

    if session_data:
        correct_ans = normalize_answer(session_data.get("answer", ""))
        explanation = session_data.get("explanation", "")
        ch_type = session_data.get("type", ch_type)
        diff = normalize_difficulty(session_data.get("difficulty", diff))
        question_text = session_data.get("question", question_text)
    elif payload.correct_answer:
        correct_ans = normalize_answer(payload.correct_answer)
        explanation = "The correct answer matched."

    # 2. Check correctness / timeout
    is_correct = False
    if payload.is_timeout:
        is_correct = False
        msg = "⏱️ Time expired! Attempt recorded as failed."
        explanation = explanation or "Time limit reached before answer submission."
    elif user_ans and user_ans == correct_ans:
        is_correct = True
        msg = "✓ Correct! Challenge completed."
    else:
        try:
            if user_ans and float(user_ans) == float(correct_ans):
                is_correct = True
                msg = "✓ Correct! Challenge completed."
            else:
                msg = "✗ Incorrect answer. Try again!"
        except ValueError:
            msg = "✗ Incorrect answer. Try again!"

    # 3. Record attempt in Database if user is authenticated (or fallback to default user)
    user_id = current_user.id if current_user else 1
    attempt_num = payload.attempt_number or 1
    time_limit_val = payload.time_limit or get_time_limit_for_difficulty(diff)
    time_taken_val = int(payload.time_taken or 0)

    try:
        attempt_record = ChallengeAttempt(
            user_id=user_id,
            alarm_id=payload.alarm_id,
            challenge_type=ch_type,
            difficulty=diff,
            question=question_text[:500],
            correct_answer=correct_ans or payload.correct_answer or "",
            user_answer=payload.user_answer or "",
            is_correct=is_correct,
            attempt_number=attempt_num,
            time_taken=time_taken_val,
            time_limit=time_limit_val
        )
        db.add(attempt_record)
        db.commit()
        db.refresh(attempt_record)
    except Exception as err:
        logger.error(f"Error logging challenge attempt to database: {err}")
        db.rollback()

    # 4. Determine adaptive recommendation and next challenge
    rec = get_adaptive_recommendation(db=db, user_id=user_id, base_difficulty=diff, preferred_type=ch_type)
    next_challenge_obj = None

    if not is_correct:
        # Step down difficulty (e.g. Expert -> Hard -> Medium -> Easy -> Beginner)
        new_diff = step_difficulty(diff, -1)
        normalized_type = map_challenge_type(ch_type)

        try:
            new_data = generate_cognitive_challenge(normalized_type, new_diff)
            session_id = f"chal_{uuid.uuid4().hex[:12]}"
            new_data["id"] = session_id
            new_data["user_id"] = user_id
            new_data["recommended_difficulty"] = new_diff
            new_data["recommended_challenge_type"] = ch_type
            new_data["adaptive_reason"] = rec["reason"]
            new_data["alarm_id"] = payload.alarm_id
            new_data["time_limit"] = get_time_limit_for_difficulty(new_diff)
            add_session(session_id, new_data)
            next_challenge_obj = ChallengeResponse(**new_data)
        except Exception as e:
            logger.error(f"Error generating lower difficulty challenge on failure: {e}")

        next_diff = new_diff
        prefix = "⏱️ Time expired!" if payload.is_timeout else "✗ Incorrect answer!"
        if new_diff != diff:
            msg = f"{prefix} Lowering difficulty to {new_diff}. Solve this new question:"
        else:
            msg = f"{prefix} Try this new question:"
    else:
        next_diff = rec["recommended_difficulty"]

    # 5. If the challenge was completed successfully, remove active session so future alarms can regenerate
    if is_correct and payload.challenge_id:
        try:
            remove_challenge_session(payload.challenge_id)
            try:
                import scheduler
                scheduler.triggered_alarms = [t for t in scheduler.triggered_alarms if not (t.get("challenge", {}).get("id") == payload.challenge_id or t.get("id") == payload.alarm_id)]
            except Exception:
                logger.debug("Could not prune scheduler.triggered_alarms or scheduler not loaded")
        except Exception as e:
            logger.error(f"Error removing challenge session {payload.challenge_id}: {e}")

    return ChallengeValidateResponse(
        correct=is_correct,
        message=msg,
        explanation=explanation or "Double check your response and try again.",
        attempt_number=attempt_num,
        next_recommended_difficulty=next_diff,
        next_recommended_type=rec["recommended_challenge_type"],
        adaptive_reason=rec["reason"],
        next_challenge=next_challenge_obj
    )

@router.get("/performance", response_model=UserPerformanceResponse)
def get_user_performance(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieves user's historical cognitive challenge performance and recent attempts.
    """
    attempts = (
        db.query(ChallengeAttempt)
        .filter(ChallengeAttempt.user_id == current_user.id)
        .order_by(desc(ChallengeAttempt.created_at))
        .all()
    )

    rec = get_adaptive_recommendation(db, current_user.id, "Medium")
    analysis = rec["analysis"]

    total_attempts = analysis["total_attempts"]
    total_passed = analysis["passed_attempts"]
    accuracy_percentage = analysis["overall_accuracy"]
    avg_time = analysis["avg_time_taken"]

    return UserPerformanceResponse(
        user_id=current_user.id,
        total_attempts=total_attempts,
        total_passed=total_passed,
        accuracy_percentage=accuracy_percentage,
        average_time_taken=avg_time,
        recommended_difficulty=rec["recommended_difficulty"],
        preferred_challenge_type=rec["recommended_challenge_type"],
        reason=rec["reason"],
        score=analysis.get("score", 50.0),
        trend=analysis.get("trend", "stable"),
        strong_types=analysis.get("strong_types", []),
        weak_types=analysis.get("weak_types", []),
        type_breakdown=analysis.get("type_breakdown", {}),
        recent_attempts=[ChallengeAttemptResponse.model_validate(a) for a in attempts[:10]]
    )
