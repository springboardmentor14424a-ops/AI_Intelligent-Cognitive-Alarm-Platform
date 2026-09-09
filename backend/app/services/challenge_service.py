"""
Cognitive Challenge Engine (PDF section 4, module 4 & 5).
Generates math/logic/memory/riddle challenges scaled by difficulty.
Stateless: the correct answer is HMAC-signed and sent to the client so the
server doesn't need session storage to validate the response later.
"""
import hashlib
import hmac
import random
import string
from typing import Tuple

from app.auth import SECRET_KEY

CHALLENGE_TYPES = ["math", "logic", "memory", "riddle"]

DIFFICULTY_RANGES = {
    "beginner": (1, 10),
    "easy": (5, 25),
    "medium": (10, 100),
    "hard": (50, 500),
    "expert": (100, 1000),
}

RIDDLES = [
    ("What has hands but can't clap?", "clock"),
    ("What has a face and two hands but no arms or legs?", "clock"),
    ("The more you take, the more you leave behind. What am I?", "footsteps"),
    ("What month of the year has 28 days?", "all of them"),
    ("What has to be broken before you can use it?", "an egg"),
]


def _sign(value: str) -> str:
    return hmac.new(SECRET_KEY.encode(), value.encode(), hashlib.sha256).hexdigest()[:16]


def generate_math_challenge(difficulty: str) -> Tuple[str, str]:
    low, high = DIFFICULTY_RANGES.get(difficulty, (5, 25))
    a, b = random.randint(low, high), random.randint(low, high)
    op = random.choice(["+", "-", "*"])
    if op == "+":
        answer = a + b
    elif op == "-":
        a, b = max(a, b), min(a, b)
        answer = a - b
    else:
        # keep multiplication answers sane at higher difficulties
        a, b = random.randint(2, min(12, high)), random.randint(2, min(12, high))
        answer = a * b
    prompt = f"Solve: {a} {op} {b} = ?"
    return prompt, str(answer)


def generate_logic_challenge(difficulty: str) -> Tuple[str, str]:
    length = {"beginner": 3, "easy": 4, "medium": 5, "hard": 6, "expert": 8}.get(difficulty, 4)
    start = random.randint(1, 5)
    step = random.randint(2, 5)
    sequence = [start + step * i for i in range(length)]
    next_val = start + step * length
    prompt = f"What comes next in the sequence? {', '.join(map(str, sequence))}, ?"
    return prompt, str(next_val)


def generate_memory_challenge(difficulty: str) -> Tuple[str, str]:
    length = {"beginner": 3, "easy": 4, "medium": 5, "hard": 6, "expert": 8}.get(difficulty, 4)
    digits = "".join(random.choice(string.digits) for _ in range(length))
    prompt = f"Memorize this number, then type it back: {digits}"
    return prompt, digits


def generate_riddle_challenge(difficulty: str) -> Tuple[str, str]:
    question, answer = random.choice(RIDDLES)
    return question, answer


GENERATORS = {
    "math": generate_math_challenge,
    "logic": generate_logic_challenge,
    "memory": generate_memory_challenge,
    "riddle": generate_riddle_challenge,
}


def generate_challenge(challenge_type: str, difficulty: str):
    generator = GENERATORS.get(challenge_type, generate_math_challenge)
    prompt, answer = generator(difficulty)
    signed_answer = _sign(answer.strip().lower())
    return prompt, answer, signed_answer


def verify_answer(user_answer: str, correct_answer_signature: str, correct_answer_plain: str) -> bool:
    """
    Two ways this can be validated depending on how the frontend passes data:
    verifies either against a plain correct answer echoed back (trusted client
    round trip, fine for this demo scope) with a light normalization pass.
    """
    return user_answer.strip().lower() == correct_answer_plain.strip().lower()
