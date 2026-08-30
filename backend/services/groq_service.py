import os
import json
import logging
import requests
from typing import Optional
from config import settings
from services.personalization_service import normalize_difficulty, get_time_limit_for_difficulty

logger = logging.getLogger(__name__)

DEFAULT_GROQ_MODELS = [
    "openai/gpt-oss-20b",
    "qwen/qwen3-32b",
    "llama-3.3-70b-versatile"
]


def get_groq_models() -> list[str]:
    configured_models = getattr(settings, "GROQ_MODELS", "")
    models = [model.strip() for model in configured_models.split(",") if model.strip()]
    return models or DEFAULT_GROQ_MODELS

def build_groq_prompt(challenge_type: str, difficulty: str) -> str:
    """
    Constructs an optimized prompt for Groq LLMs to generate a wake-up cognitive challenge.
    """
    normalized_diff = normalize_difficulty(difficulty)
    difficulty_instructions = {
        "Beginner": "Very gentle, basic calculations, simple direct questions, or 2-item memory tasks for gentle morning wakeups.",
        "Easy": "Simple calculations, basic patterns, direct riddles, or simple memory tasks that kickstart alertness.",
        "Medium": "Multi-step reasoning, moderate arithmetic, complex word/pattern matching, or multi-item memory tasks.",
        "Hard": "Challenging multi-step logic, complex math equations, deep pattern recognition, or multi-element recall.",
        "Expert": "Rapid, high-intensity cognitive arousal drills, advanced algebra/logic, multi-layered memory recall."
    }

    diff_desc = difficulty_instructions.get(normalized_diff, difficulty_instructions["Medium"])

    prompt = f"""You are the AI Cognitive Engine for WakeWise AI, an intelligent alarm platform designed to overcome sleep inertia.
Generate ONE single WAKE-UP cognitive challenge.

Requirements:
- Challenge Type: {challenge_type}
- Difficulty Level: {normalized_diff} ({diff_desc})
- The question must be clear, unambiguous, suitable for morning alertness, and have exactly ONE correct answer.
- Provide 4 multiple-choice options in the "options" array whenever suitable (e.g. for Math, Logic, Quizzes, Patterns, Word Games, Memory). Make sure the exact correct answer is in the options list!
- For open-ended riddles where options aren't necessary, "options" can be [].
- For Memory Challenges: Include the items to be memorized clearly inside the question (e.g., "Memorize this list: APPLE, RIVER, CLOCK, MOUNTAIN, GUITAR. What was the 3rd item?").

You MUST return strictly valid JSON matching this exact schema:
{{
    "type": "{challenge_type}",
    "difficulty": "{normalized_diff}",
    "question": "<string question>",
    "options": ["<option1>", "<option2>", "<option3>", "<option4>"],
    "answer": "<exact correct answer>",
    "explanation": "<short clear explanation of the solution>"
}}"""
    return prompt.strip()


def generate_groq_challenge(
    challenge_type: str,
    difficulty: str,
    api_key: Optional[str] = None
) -> Optional[dict]:
    """
    Generates a dynamic cognitive challenge via Groq API (ultra-fast sub-second latency).
    Returns challenge dictionary if successful, or None if failed/unconfigured.
    """
    groq_key = api_key if api_key is not None else (settings.GROQ_API_KEY or os.getenv("GROQ_API_KEY", ""))
    if not groq_key or not groq_key.strip():
        logger.debug("GROQ_API_KEY not configured. Skipping Groq provider.")
        return None

    groq_key = groq_key.strip()
    normalized_diff = normalize_difficulty(difficulty)
    prompt = build_groq_prompt(challenge_type, normalized_diff)

    endpoint = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {groq_key}",
        "Content-Type": "application/json"
    }

    for model_name in get_groq_models():
        payload = {
            "model": model_name,
            "messages": [
                {
                    "role": "system",
                    "content": "You are the AI Cognitive Engine for WakeWise AI. Always output strictly valid JSON matching the requested schema."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            "response_format": {"type": "json_object"},
            "temperature": 0.6,
            "max_tokens": 800
        }

        try:
            res = requests.post(endpoint, headers=headers, json=payload, timeout=6.0)
            if res.status_code == 200:
                res_data = res.json()
                choices = res_data.get("choices", [])
                if not choices:
                    continue

                content = choices[0].get("message", {}).get("content", "").strip()
                if not content:
                    continue

                # Strip markdown fences if any
                if content.startswith("```json"):
                    content = content[7:]
                if content.startswith("```"):
                    content = content[3:]
                if content.endswith("```"):
                    content = content[:-3]
                content = content.strip()

                challenge_obj = json.loads(content)

                # Validate required keys
                required_keys = ["type", "difficulty", "question", "options", "answer", "explanation"]
                if not all(k in challenge_obj for k in required_keys):
                    logger.warning(f"Groq response missing required keys from model '{model_name}'.")
                    continue

                challenge_obj["type"] = challenge_type
                challenge_obj["difficulty"] = normalized_diff
                if not isinstance(challenge_obj.get("options"), list):
                    challenge_obj["options"] = []

                challenge_obj["answer"] = str(challenge_obj["answer"]).strip()
                challenge_obj["explanation"] = str(challenge_obj["explanation"]).strip()
                challenge_obj["time_limit"] = get_time_limit_for_difficulty(normalized_diff)
                challenge_obj["ai_provider"] = f"Groq ({model_name})"

                logger.info(f"Groq API model '{model_name}' successfully generated cognitive challenge for '{challenge_type}' ({normalized_diff})!")
                return challenge_obj

            else:
                logger.warning(f"Groq API model '{model_name}' returned status {res.status_code}: {res.text[:200]}")

        except Exception as e:
            logger.warning(f"Groq API model '{model_name}' request error: {e}")
            continue

    return None
