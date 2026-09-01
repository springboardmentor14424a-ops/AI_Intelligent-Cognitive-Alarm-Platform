"""Gemini service using Google's current GenAI Python SDK with safe fallback generation."""
import json
import logging
import os
import re
from typing import Optional

try:
    from google import genai as modern_genai
except ImportError:
    modern_genai = None

logger = logging.getLogger(__name__)


class GeminiChallengeGenerator:
    """Generate personalized cognitive challenges with Gemini or deterministic fallback."""

    MODEL_CANDIDATES = (
        "gemini-3.7-flash",
        "gemini-3.1-flash-lite",
        "gemini-flash-latest",
        "gemini-2.5-flash-lite",
    )

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("GEMINI_API_KEY")
        self.enabled = bool(self.api_key)
        self.client = None
        self.model_name: Optional[str] = None
        self.last_response_source = "DETERMINISTIC"

        if not self.enabled:
            logger.warning("Gemini API key not found - challenges will use fallback generation")
            return

        try:
            if modern_genai is not None:
                self.client = modern_genai.Client(api_key=self.api_key)
                self.model_name = self.MODEL_CANDIDATES[0]
                logger.info("Gemini GenAI client initialized")
            else:
                self.enabled = False
                logger.warning("The Google GenAI SDK is unavailable; deterministic challenge fallback will be used.")
        except Exception as exc:
            logger.error("Failed to initialize Gemini client: %s", exc)
            self.client = None
            self.enabled = False

    def _generate_text(self, prompt: str) -> str:
        if not self.client:
            raise RuntimeError("Gemini client is unavailable")
        last_error = None
        for model_name in self.MODEL_CANDIDATES:
            try:
                response = self.client.models.generate_content(model=model_name, contents=prompt)
                text = (getattr(response, "text", "") or "").strip()
                if text:
                    self.model_name = model_name
                    return text
            except Exception as exc:
                last_error = exc
                logger.debug("Gemini model %s unavailable: %s", model_name, exc)
        raise RuntimeError(f"No configured Gemini model responded: {last_error}")

    def generate_personalized_challenge(
        self, challenge_type: str, difficulty: str, user_profile: dict, intent: str = "WAKE_UP"
    ) -> Optional[dict]:
        if not self.enabled:
            return None
        try:
            response_text = self._generate_text(
                self._build_gemini_prompt(challenge_type, difficulty, user_profile, intent)
            )
            return self._parse_gemini_response(response_text, challenge_type)
        except Exception as exc:
            logger.warning("Gemini challenge generation failed: %s", exc)
            return None

    def _build_gemini_prompt(self, challenge_type: str, difficulty: str, user_profile: dict, intent: str) -> str:
        context = intent.replace("_", " ").title()
        productivity_goal = user_profile.get("productivity_goal", "general wellness")
        habits = ", ".join(user_profile.get("habit_preferences", [])[:5]) or "general habits"
        complexity = {
            "BEGINNER": "very simple concepts and generous timing",
            "EASY": "simple concepts",
            "MEDIUM": "moderate complexity",
            "HARD": "complex reasoning",
            "EXPERT": "advanced reasoning with minimal scaffolding",
        }.get(difficulty, "moderate complexity")
        return f"""Generate one concise cognitive challenge.
Challenge Type: {challenge_type}
Difficulty: {difficulty} ({complexity})
Context: {context}
User Goal: {productivity_goal}
User Habits: {habits}

Return ONLY valid JSON with exactly:
{{"prompt":"...","expected_answer":"...","instructions":"..."}}
The expected answer must be concise and unambiguous. Do not include markdown."""

    def _parse_gemini_response(self, response_text: str, challenge_type: str) -> Optional[dict]:
        try:
            cleaned = response_text.strip()
            if cleaned.startswith("```"):
                cleaned = cleaned.strip("`").strip()
                if cleaned.lower().startswith("json"):
                    cleaned = cleaned[4:].strip()
            data = json.loads(cleaned)
            if not all(key in data for key in ("prompt", "expected_answer", "instructions")):
                return None
            return {
                "prompt": str(data["prompt"]).strip(),
                "expected_answer": str(data["expected_answer"]).strip(),
                "instructions": str(data["instructions"]).strip(),
            }
        except Exception as exc:
            logger.warning("Failed to parse Gemini response for %s: %s", challenge_type, exc)
            return None

    def generate_challenge_with_fallback(self, challenge_type: str, difficulty: str, user_profile: dict, intent: str, fallback_generator):
        result = self.generate_personalized_challenge(challenge_type, difficulty, user_profile, intent)
        if result:
            return result["prompt"], result["expected_answer"], result["instructions"], "GEMINI"
        prompt, answer, instructions = fallback_generator(challenge_type, difficulty, intent)
        return prompt, answer, instructions, "DETERMINISTIC"

    def _build_assistant_prompt(self, user_message: str, user_profile: Optional[dict] = None) -> str:
        profile = user_profile or {}
        productivity_goal = profile.get("productivity_goal") or "feel more awake and focused"
        habits = ", ".join(profile.get("habit_preferences") or []) or "simple morning routines"
        timezone = profile.get("timezone") or "your local timezone"
        return (
            "You are a concise morning wellness coach for a cognitive alarm app. Reply in 2-4 sentences. "
            f"User message: {user_message}. Goal: {productivity_goal}. Habits: {habits}. Timezone: {timezone}. "
            "Be warm, practical, and easy to act on immediately."
        )

    def _clean_assistant_response(self, response_text: str) -> str:
        cleaned = re.sub(r"```.*?```", "", response_text, flags=re.S).strip()
        cleaned = re.sub(r"\s+", " ", cleaned)
        return cleaned if len(cleaned) <= 500 else cleaned[:497].rstrip() + "..."

    def generate_assistant_reply(self, user_message: str, user_profile: Optional[dict] = None) -> str:
        if not str(user_message or "").strip():
            return "Tell me what you need in your morning routine and I’ll help you simplify it."
        if not self.enabled:
            self.last_response_source = "DETERMINISTIC"
            return self._fallback_assistant_reply(user_message, user_profile)
        try:
            text = self._generate_text(self._build_assistant_prompt(user_message, user_profile))
            self.last_response_source = "GEMINI"
            return self._clean_assistant_response(text)
        except Exception as exc:
            logger.warning("Gemini assistant reply failed: %s", exc)
            self.last_response_source = "DETERMINISTIC"
            return self._fallback_assistant_reply(user_message, user_profile)

    def _fallback_assistant_reply(self, user_message: str, user_profile: Optional[dict] = None) -> str:
        message = (user_message or "").strip().lower()
        profile = user_profile or {}
        goal = profile.get("productivity_goal") or "focus better in the morning"
        if any(keyword in message for keyword in ("tired", "sleepy", "wake", "morning")):
            return f"Start with one small win: drink water, get sunlight, and choose one priority for {goal}."
        if any(keyword in message for keyword in ("focus", "productive", "work", "study")):
            return f"Protect a short focus block for {goal}. Remove notifications and start with one task."
        return "Keep the routine small and repeatable. Pick one stabilizing action, finish it, and let the rest follow."


_gemini_service = None


def get_gemini_service() -> GeminiChallengeGenerator:
    global _gemini_service
    if _gemini_service is None:
        _gemini_service = GeminiChallengeGenerator()
    return _gemini_service


def is_gemini_enabled() -> bool:
    return get_gemini_service().enabled
