from backend import main as main_module
from backend.main import generate_challenge_with_gemini


class ExplodingGeminiService:
    """Stands in for the real Gemini service; raises if actually invoked,
    so tests can prove a challenge type never reaches it."""

    enabled = True

    def generate_challenge_with_fallback(self, *args, **kwargs):
        raise AssertionError("Gemini should not have been called for this challenge type")


def test_word_always_uses_deterministic_generator_even_with_gemini_enabled(monkeypatch):
    monkeypatch.setattr(main_module, "USE_GEMINI_CHALLENGES", True)
    monkeypatch.setattr(main_module, "get_gemini_service", lambda: ExplodingGeminiService())

    prompt, answer, instructions, source = generate_challenge_with_gemini("WORD", "MEDIUM", "WAKE_UP", {})

    assert source == "DETERMINISTIC"
    assert prompt and answer and instructions


def test_quiz_always_uses_deterministic_generator_even_with_gemini_enabled(monkeypatch):
    monkeypatch.setattr(main_module, "USE_GEMINI_CHALLENGES", True)
    monkeypatch.setattr(main_module, "get_gemini_service", lambda: ExplodingGeminiService())

    prompt, answer, instructions, source = generate_challenge_with_gemini("QUIZ", "MEDIUM", "WAKE_UP", {})

    assert source == "DETERMINISTIC"
    assert prompt and answer and instructions


def test_math_attempts_gemini_when_enabled(monkeypatch):
    """Sanity check that the WORD/QUIZ carve-out is specific, not a blanket
    disable: other types still reach the Gemini service when it's enabled."""
    calls = {}

    class RecordingGeminiService:
        enabled = True

        def generate_challenge_with_fallback(self, challenge_type, difficulty, user_profile, intent, fallback_generator):
            calls["called"] = True
            prompt, answer, instructions = fallback_generator(challenge_type, difficulty, intent)
            return prompt, answer, instructions, "DETERMINISTIC"

    monkeypatch.setattr(main_module, "USE_GEMINI_CHALLENGES", True)
    monkeypatch.setattr(main_module, "get_gemini_service", lambda: RecordingGeminiService())

    generate_challenge_with_gemini("MATH", "MEDIUM", "WAKE_UP", {})

    assert calls.get("called") is True
