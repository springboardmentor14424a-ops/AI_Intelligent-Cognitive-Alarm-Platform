from pydantic import BaseModel, Field
from typing import Optional, List, Any, Union

class ChallengeRequest(BaseModel):
    challenge_type: str = Field(default="math", description="math, logic, memory, word, pattern, riddle, quiz, random")
    difficulty: str = Field(default="medium", description="easy, medium, hard")

class ChallengeResponse(BaseModel):
    challenge_id: str
    type: str
    difficulty: str
    title: str
    instructions: str
    question: Any  # String, List, or Dict depending on challenge type
    options: Optional[List[str]] = None
    input_type: str  # "number", "text", "choice", "sequence"
    hint: Optional[str] = None
    time_limit: int  # in seconds
    answer_key: str  # Encrypted or plain text string representation for verification

class ChallengeVerifyRequest(BaseModel):
    challenge_id: str
    answer_key: str
    user_answer: str
    time_taken_seconds: float = 0.0

class ChallengeVerifyResponse(BaseModel):
    success: bool
    message: str
    correct_answer: str
    score: int
