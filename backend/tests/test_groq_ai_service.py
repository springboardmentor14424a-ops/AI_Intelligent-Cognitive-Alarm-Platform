import unittest
from unittest.mock import patch, MagicMock
from services.groq_service import build_groq_prompt, generate_groq_challenge
from services.gemini_service import generate_cognitive_challenge
from config import settings

class TestGroqAIService(unittest.TestCase):

    def test_build_groq_prompt(self):
        prompt = build_groq_prompt("Math Problems", "Hard")
        self.assertIn("Math Problems", prompt)
        self.assertIn("Hard", prompt)
        self.assertIn("JSON", prompt)

    def test_groq_service_no_key(self):
        """When GROQ_API_KEY is empty, returns None without crashing."""
        res = generate_groq_challenge("Math Problems", "Medium", api_key="")
        self.assertIsNone(res)

    @patch("requests.post")
    def test_groq_service_successful_generation(self, mock_post):
        """Mocked Groq API call returns structured challenge."""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "choices": [
                {
                    "message": {
                        "content": '{"type":"Math Problems","difficulty":"Medium","question":"What is 18 x 6?","options":["108","118","98","128"],"answer":"108","explanation":"18 times 6 is 108."}'
                    }
                }
            ]
        }
        mock_post.return_value = mock_response

        res = generate_groq_challenge("Math Problems", "Medium", api_key="gsk_test_mock_key_12345")
        self.assertIsNotNone(res)
        self.assertEqual(res["question"], "What is 18 x 6?")
        self.assertEqual(res["answer"], "108")
        self.assertIn("108", res["options"])
        self.assertIn("Groq", res["ai_provider"])

    @patch("requests.post")
    def test_multi_provider_orchestration(self, mock_post):
        """Orchestrator generates cognitive challenges reliably."""
        challenge = generate_cognitive_challenge("Logic Puzzles", "Easy")
        self.assertIn("question", challenge)
        self.assertIn("answer", challenge)
        self.assertIn("explanation", challenge)
        self.assertIn("type", challenge)
        self.assertIn("difficulty", challenge)
        self.assertIn("ai_provider", challenge)

    @patch("services.groq_service.generate_groq_challenge")
    @patch("services.gemini_service._generate_gemini_challenge", return_value=None)
    def test_groq_is_used_when_gemini_fails(self, mock_gemini, mock_groq):
        fallback_challenge = {
            "type": "Logic Puzzles",
            "difficulty": "Easy",
            "question": "Fallback question",
            "options": [],
            "answer": "yes",
            "explanation": "Fallback answer",
            "ai_provider": "Groq (openai/gpt-oss-20b)"
        }
        mock_groq.return_value = fallback_challenge

        with patch.object(settings, "GEMINI_API_KEY", "gemini-test-key"), \
             patch.object(settings, "GROQ_API_KEY", "groq-test-key"):
            result = generate_cognitive_challenge(
                "Logic Puzzles", "Easy", preferred_provider="gemini"
            )

        self.assertIs(result, fallback_challenge)
        mock_gemini.assert_called_once()
        mock_groq.assert_called_once()

if __name__ == "__main__":
    unittest.main()
