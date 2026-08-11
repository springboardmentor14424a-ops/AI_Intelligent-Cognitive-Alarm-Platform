import uuid
import logging
from typing import Dict, Optional
from fastapi import APIRouter, HTTPException, Query, status

from schemas import (
    ChallengeTypesResponse,
    ChallengeResponse,
    ChallengeValidateRequest,
    ChallengeValidateResponse
)
from services.gemini_service import (
    generate_cognitive_challenge,
    ALLOWED_TYPES,
    ALLOWED_DIFFICULTIES,
    map_challenge_type
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/challenges", tags=["Cognitive Challenges"])

# In-memory store for active generated challenge sessions
ACTIVE_CHALLENGE_SESSIONS: Dict[str, dict] = {}

@router.get("/types", response_model=ChallengeTypesResponse)
def get_challenge_types():
    """
    Returns supported cognitive challenge types and difficulty levels.
    """
    return ChallengeTypesResponse(
        challenge_types=ALLOWED_TYPES,
        difficulty_levels=ALLOWED_DIFFICULTIES
    )

@router.get("/generate", response_model=ChallengeResponse)
def generate_challenge(
    challenge_type: str = Query(..., description="Challenge type (e.g. Math Problems, Logic Puzzles, etc.)"),
    difficulty: str = Query(..., description="Difficulty level (Easy, Medium, Hard)")
):
    """
    Generates a dynamic cognitive challenge via Gemini API (or local fallback).
    Validates input parameters and returns standard challenge structure.
    """
    valid_raw_types = {t.lower() for t in ALLOWED_TYPES} | {"math", "logic", "memory", "word", "pattern", "riddle", "quiz", "tap", "none"}
    
    if not challenge_type or challenge_type.strip().lower() not in valid_raw_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid challenge_type '{challenge_type}'. Must be one of: {', '.join(ALLOWED_TYPES)}"
        )

    normalized_diff = difficulty.title() if difficulty else ""
    if normalized_diff not in ALLOWED_DIFFICULTIES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid difficulty '{difficulty}'. Must be one of: {', '.join(ALLOWED_DIFFICULTIES)}"
        )

    normalized_type = map_challenge_type(challenge_type)

    # Call Gemini Service
    challenge_data = generate_cognitive_challenge(normalized_type, normalized_diff)

    # Generate session ID and store server-side
    session_id = f"chal_{uuid.uuid4().hex[:12]}"
    challenge_data["id"] = session_id

    ACTIVE_CHALLENGE_SESSIONS[session_id] = challenge_data

    return ChallengeResponse(**challenge_data)

def normalize_answer(ans: str) -> str:
    """Helper to clean and normalize answer strings for validation."""
    if not ans:
        return ""
    clean = ans.strip().lower()
    # Remove leading articles for text answers (e.g., "a clock" -> "clock")
    for prefix in ["a ", "an ", "the "]:
        if clean.startswith(prefix):
            clean = clean[len(prefix):].strip()
    return clean

@router.post("/validate", response_model=ChallengeValidateResponse)
def validate_challenge(payload: ChallengeValidateRequest):
    """
    Validates user's challenge answer server-side.
    """
    user_ans = normalize_answer(payload.user_answer)
    correct_ans = ""
    explanation = ""

    # 1. Lookup from active challenge session if session ID is provided
    if payload.challenge_id and payload.challenge_id in ACTIVE_CHALLENGE_SESSIONS:
        session_data = ACTIVE_CHALLENGE_SESSIONS[payload.challenge_id]
        correct_ans = normalize_answer(session_data.get("answer", ""))
        explanation = session_data.get("explanation", "")
    elif payload.correct_answer:
        correct_ans = normalize_answer(payload.correct_answer)
        explanation = "The correct answer matched."
    else:
        # Fallback if no session found and no explicit answer provided
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Challenge session not found or missing validation parameters."
        )

    # Compare answers
    is_correct = False

    if user_ans == correct_ans:
        is_correct = True
    else:
        # Numeric equality check (e.g. "378" == "378.0" or "43" == "43")
        try:
            if float(user_ans) == float(correct_ans):
                is_correct = True
        except ValueError:
            pass

    if is_correct:
        return ChallengeValidateResponse(
            correct=True,
            message="Correct! Challenge completed.",
            explanation=explanation or f"Correct answer: {payload.correct_answer or correct_ans}"
        )
    else:
        return ChallengeValidateResponse(
            correct=False,
            message="Incorrect answer. Try again!",
            explanation=explanation or "Double check your response and try again."
        )
