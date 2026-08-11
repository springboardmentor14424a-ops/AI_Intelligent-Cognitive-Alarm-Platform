import random
import logging

logger = logging.getLogger(__name__)

# Comprehensive predefined local fallback challenges matrix
# Supports 7 Challenge Types x 3 Difficulty Levels (Easy, Medium, Hard)
FALLBACK_CHALLENGES = {
    "Math Problems": {
        "Easy": [
            {
                "type": "Math Problems",
                "difficulty": "Easy",
                "question": "What is 15 + 28?",
                "options": ["33", "43", "45", "53"],
                "answer": "43",
                "explanation": "15 + 28 = 43."
            },
            {
                "type": "Math Problems",
                "difficulty": "Easy",
                "question": "What is 9 × 6?",
                "options": ["45", "54", "63", "56"],
                "answer": "54",
                "explanation": "9 × 6 = 54."
            }
        ],
        "Medium": [
            {
                "type": "Math Problems",
                "difficulty": "Medium",
                "question": "What is 27 × 14?",
                "options": ["368", "378", "388", "398"],
                "answer": "378",
                "explanation": "27 × 14 = 378."
            },
            {
                "type": "Math Problems",
                "difficulty": "Medium",
                "question": "What is (14 × 8) + 36?",
                "options": ["144", "148", "152", "160"],
                "answer": "148",
                "explanation": "14 × 8 = 112; 112 + 36 = 148."
            }
        ],
        "Hard": [
            {
                "type": "Math Problems",
                "difficulty": "Hard",
                "question": "What is (45 × 12) - 175?",
                "options": ["345", "355", "365", "375"],
                "answer": "365",
                "explanation": "45 × 12 = 540; 540 - 175 = 365."
            },
            {
                "type": "Math Problems",
                "difficulty": "Hard",
                "question": "What is 18² + 49?",
                "options": ["363", "373", "383", "393"],
                "answer": "373",
                "explanation": "18 squared is 324; 324 + 49 = 373."
            }
        ]
    },
    "Logic Puzzles": {
        "Easy": [
            {
                "type": "Logic Puzzles",
                "difficulty": "Easy",
                "question": "If all A are B, and all B are C, are all A also C?",
                "options": ["Yes", "No", "Cannot be determined", "Only on weekdays"],
                "answer": "Yes",
                "explanation": "By transitivity, if all A belong to B and B belong to C, then all A belong to C."
            }
        ],
        "Medium": [
            {
                "type": "Logic Puzzles",
                "difficulty": "Medium",
                "question": "A doctor and a bus driver are both in love with the same woman, Sarah. The bus driver had to go on a 7-day trip. Before leaving, he gave Sarah 7 apples. Why?",
                "options": ["An apple a day keeps the doctor away", "She loves apples", "It was a token of luck", "He bought them on sale"],
                "answer": "An apple a day keeps the doctor away",
                "explanation": "The classic idiom: 'An apple a day keeps the doctor away!'"
            }
        ],
        "Hard": [
            {
                "type": "Logic Puzzles",
                "difficulty": "Hard",
                "question": "If five cats can catch five mice in five minutes, how many cats are needed to catch 100 mice in 100 minutes?",
                "options": ["5", "20", "100", "50"],
                "answer": "5",
                "explanation": "5 cats catch 1 mouse per 5 minutes. So in 100 minutes, the same 5 cats catch 20 mice each = 100 mice total."
            }
        ]
    },
    "Memory Challenges": {
        "Easy": [
            {
                "type": "Memory Challenges",
                "difficulty": "Easy",
                "question": "Memorize this list: APPLE, RIVER, CLOCK. What was the 2nd item?",
                "options": ["APPLE", "RIVER", "CLOCK", "MOUNTAIN"],
                "answer": "RIVER",
                "explanation": "The 2nd item in APPLE, RIVER, CLOCK is RIVER."
            }
        ],
        "Medium": [
            {
                "type": "Memory Challenges",
                "difficulty": "Medium",
                "question": "Memorize this list: APPLE, RIVER, CLOCK, MOUNTAIN, GUITAR. What was the 3rd item?",
                "options": ["RIVER", "CLOCK", "MOUNTAIN", "GUITAR"],
                "answer": "CLOCK",
                "explanation": "The 3rd item in APPLE, RIVER, CLOCK, MOUNTAIN, GUITAR is CLOCK."
            }
        ],
        "Hard": [
            {
                "type": "Memory Challenges",
                "difficulty": "Hard",
                "question": "Memorize this sequence: 8 - 4 - 9 - 1 - 7 - 3. What is the sum of the 2nd and 5th numbers?",
                "options": ["9", "11", "13", "15"],
                "answer": "11",
                "explanation": "The 2nd number is 4 and the 5th number is 7. 4 + 7 = 11."
            }
        ]
    },
    "Word Games": {
        "Easy": [
            {
                "type": "Word Games",
                "difficulty": "Easy",
                "question": "Unscramble the word: 'A-W-K-E'",
                "options": ["WAKE", "WEAK", "KNEW", "WAVE"],
                "answer": "WAKE",
                "explanation": "Unscrambling 'A-W-K-E' gives 'WAKE'."
            }
        ],
        "Medium": [
            {
                "type": "Word Games",
                "difficulty": "Medium",
                "question": "Which word is an anagram of 'LISTEN'?",
                "options": ["SILENT", "INLETS", "TINSEL", "All of the above"],
                "answer": "All of the above",
                "explanation": "SILENT, INLETS, and TINSEL are all valid anagrams of LISTEN."
            }
        ],
        "Hard": [
            {
                "type": "Word Games",
                "difficulty": "Hard",
                "question": "Identify the word that means 'lasting for a very short time'.",
                "options": ["Ephemeral", "Ubiquitous", "Esoteric", "Resilient"],
                "answer": "Ephemeral",
                "explanation": "'Ephemeral' means lasting for a very short time."
            }
        ]
    },
    "Pattern Recognition": {
        "Easy": [
            {
                "type": "Pattern Recognition",
                "difficulty": "Easy",
                "question": "What comes next in the sequence: 2, 4, 6, 8, __?",
                "options": ["9", "10", "11", "12"],
                "answer": "10",
                "explanation": "The sequence increments by 2 each step. 8 + 2 = 10."
            }
        ],
        "Medium": [
            {
                "type": "Pattern Recognition",
                "difficulty": "Medium",
                "question": "What number completes the pattern: 3, 6, 12, 24, __?",
                "options": ["30", "36", "48", "60"],
                "answer": "48",
                "explanation": "Each number doubles the previous one. 24 × 2 = 48."
            }
        ],
        "Hard": [
            {
                "type": "Pattern Recognition",
                "difficulty": "Hard",
                "question": "What is the next number in the Fibonacci sequence: 1, 1, 2, 3, 5, 8, 13, __?",
                "options": ["18", "20", "21", "24"],
                "answer": "21",
                "explanation": "The next Fibonacci term is 8 + 13 = 21."
            }
        ]
    },
    "Riddles": {
        "Easy": [
            {
                "type": "Riddles",
                "difficulty": "Easy",
                "question": "What has hands but cannot clap?",
                "options": ["A clock", "A statue", "A glove", "A robot"],
                "answer": "A clock",
                "explanation": "A clock has hands to tell time but cannot clap."
            }
        ],
        "Medium": [
            {
                "type": "Riddles",
                "difficulty": "Medium",
                "question": "What gets wetter the more it dries?",
                "options": ["A sponge", "A towel", "A cloud", "Rain"],
                "answer": "A towel",
                "explanation": "A towel gets wetter as it dries water off you."
            }
        ],
        "Hard": [
            {
                "type": "Riddles",
                "difficulty": "Hard",
                "question": "I speak without a mouth and hear without ears. I have no body, but I come alive with wind. What am I?",
                "options": ["An echo", "A shadow", "A cloud", "A whisper"],
                "answer": "An echo",
                "explanation": "An echo returns sound without a physical body."
            }
        ]
    },
    "Quick Quizzes": {
        "Easy": [
            {
                "type": "Quick Quizzes",
                "difficulty": "Easy",
                "question": "What is the capital of France?",
                "options": ["London", "Berlin", "Paris", "Madrid"],
                "answer": "Paris",
                "explanation": "Paris is the capital of France."
            }
        ],
        "Medium": [
            {
                "type": "Quick Quizzes",
                "difficulty": "Medium",
                "question": "Which planet is known as the Red Planet?",
                "options": ["Venus", "Mars", "Jupiter", "Saturn"],
                "answer": "Mars",
                "explanation": "Mars is commonly referred to as the Red Planet due to iron oxide on its surface."
            }
        ],
        "Hard": [
            {
                "type": "Quick Quizzes",
                "difficulty": "Hard",
                "question": "What element has the chemical symbol 'Au'?",
                "options": ["Silver", "Gold", "Copper", "Aluminum"],
                "answer": "Gold",
                "explanation": "'Au' comes from the Latin word for gold, 'Aurum'."
            }
        ]
    }
}

def get_fallback_challenge(challenge_type: str, difficulty: str) -> dict:
    """
    Returns a predefined local challenge matching challenge_type and difficulty.
    Falls back gracefully if exact match is not found.
    """
    normalized_type = challenge_type.title() if challenge_type else "Math Problems"
    normalized_diff = difficulty.title() if difficulty else "Medium"

    # Map legacy/shortcut names if any
    type_alias = {
        "Math": "Math Problems",
        "Logic": "Logic Puzzles",
        "Memory": "Memory Challenges",
        "Word": "Word Games",
        "Pattern": "Pattern Recognition",
        "Riddle": "Riddles",
        "Quiz": "Quick Quizzes",
        "Tap": "Logic Puzzles",
        "None": "Math Problems"
    }
    
    mapped_type = type_alias.get(normalized_type, normalized_type)
    
    if mapped_type not in FALLBACK_CHALLENGES:
        mapped_type = "Math Problems"
        
    if normalized_diff not in FALLBACK_CHALLENGES[mapped_type]:
        normalized_diff = "Medium"

    pool = FALLBACK_CHALLENGES[mapped_type][normalized_diff]
    challenge = random.choice(pool).copy()
    logger.warning(f"Using fallback challenge for type '{mapped_type}' ({normalized_diff})")
    return challenge
