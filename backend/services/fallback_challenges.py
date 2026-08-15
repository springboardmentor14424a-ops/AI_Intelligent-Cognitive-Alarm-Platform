import random
import logging

logger = logging.getLogger(__name__)

# Comprehensive predefined local fallback challenges matrix
# Supports 7 Challenge Types x 5 Difficulty Levels (Beginner, Easy, Medium, Difficult, Advanced)
FALLBACK_CHALLENGES = {
    "Math Problems": {
        "Beginner": [
            {
                "type": "Math Problems",
                "difficulty": "Beginner",
                "question": "What is 7 + 8?",
                "options": ["13", "14", "15", "16"],
                "answer": "15",
                "explanation": "7 + 8 = 15."
            },
            {
                "type": "Math Problems",
                "difficulty": "Beginner",
                "question": "What is 20 - 6?",
                "options": ["12", "14", "16", "18"],
                "answer": "14",
                "explanation": "20 - 6 = 14."
            }
        ],
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
                "question": "What is 9 * 6?",
                "options": ["45", "54", "63", "56"],
                "answer": "54",
                "explanation": "9 * 6 = 54."
            }
        ],
        "Medium": [
            {
                "type": "Math Problems",
                "difficulty": "Medium",
                "question": "What is 27 * 14?",
                "options": ["368", "378", "388", "398"],
                "answer": "378",
                "explanation": "27 * 14 = 378."
            },
            {
                "type": "Math Problems",
                "difficulty": "Medium",
                "question": "What is (14 * 8) + 36?",
                "options": ["144", "148", "152", "160"],
                "answer": "148",
                "explanation": "14 * 8 = 112; 112 + 36 = 148."
            }
        ],
        "Difficult": [
            {
                "type": "Math Problems",
                "difficulty": "Difficult",
                "question": "What is (45 * 12) - 175?",
                "options": ["345", "355", "365", "375"],
                "answer": "365",
                "explanation": "45 * 12 = 540; 540 - 175 = 365."
            },
            {
                "type": "Math Problems",
                "difficulty": "Difficult",
                "question": "What is (18 * 18) + 49?",
                "options": ["363", "373", "383", "393"],
                "answer": "373",
                "explanation": "18 * 18 = 324; 324 + 49 = 373."
            }
        ],
        "Advanced": [
            {
                "type": "Math Problems",
                "difficulty": "Advanced",
                "question": "Solve for x: 3x^2 - 12 = 36. (Positive value of x)",
                "options": ["3", "4", "5", "6"],
                "answer": "4",
                "explanation": "3x^2 = 48 -> x^2 = 16 -> x = 4."
            },
            {
                "type": "Math Problems",
                "difficulty": "Advanced",
                "question": "What is (23 * 17) - (14 * 12)?",
                "options": ["213", "223", "233", "243"],
                "answer": "223",
                "explanation": "23 * 17 = 391; 14 * 12 = 168; 391 - 168 = 223."
            }
        ]
    },
    "Logic Puzzles": {
        "Beginner": [
            {
                "type": "Logic Puzzles",
                "difficulty": "Beginner",
                "question": "Which of the following is heavier: 1 pound of feathers or 1 pound of rocks?",
                "options": ["Feathers", "Rocks", "They weigh the same", "Depends on humidity"],
                "answer": "They weigh the same",
                "explanation": "Both weigh exactly 1 pound."
            }
        ],
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
                "question": "A doctor and a bus driver are both in love with Sarah. The bus driver had to go on a 7-day trip. Before leaving, he gave Sarah 7 apples. Why?",
                "options": ["An apple a day keeps the doctor away", "She loves apples", "It was a token of luck", "He bought them on sale"],
                "answer": "An apple a day keeps the doctor away",
                "explanation": "The classic idiom: 'An apple a day keeps the doctor away!'"
            }
        ],
        "Difficult": [
            {
                "type": "Logic Puzzles",
                "difficulty": "Difficult",
                "question": "If five cats can catch five mice in five minutes, how many cats are needed to catch 100 mice in 100 minutes?",
                "options": ["5", "20", "100", "50"],
                "answer": "5",
                "explanation": "5 cats catch 1 mouse per 5 minutes. So in 100 minutes, the same 5 cats catch 20 mice each = 100 mice total."
            }
        ],
        "Advanced": [
            {
                "type": "Logic Puzzles",
                "difficulty": "Advanced",
                "question": "You have 3 boxes: Apples, Oranges, and Mixed. ALL 3 labels are WRONG. You pick 1 fruit from the 'Mixed' box and get an Apple. What is in the 'Oranges' box?",
                "options": ["Apples", "Mixed", "Oranges", "Empty"],
                "answer": "Apples",
                "explanation": "Since all labels are wrong, Mixed contains Apples. Therefore, the box labeled Oranges must contain Apples (or Mixed, meaning Oranges box has Apples)."
            }
        ]
    },
    "Memory Challenges": {
        "Beginner": [
            {
                "type": "Memory Challenges",
                "difficulty": "Beginner",
                "question": "Memorize this list: BLUE, RED. What was the 1st color?",
                "options": ["BLUE", "RED", "GREEN", "YELLOW"],
                "answer": "BLUE",
                "explanation": "The 1st item was BLUE."
            }
        ],
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
        "Difficult": [
            {
                "type": "Memory Challenges",
                "difficulty": "Difficult",
                "question": "Memorize this sequence: 8 - 4 - 9 - 1 - 7 - 3. What is the sum of the 2nd and 5th numbers?",
                "options": ["9", "11", "13", "15"],
                "answer": "11",
                "explanation": "The 2nd number is 4 and the 5th number is 7. 4 + 7 = 11."
            }
        ],
        "Advanced": [
            {
                "type": "Memory Challenges",
                "difficulty": "Advanced",
                "question": "Memorize this matrix: [Top: K, 7, M] [Bottom: 4, R, 9]. What character was bottom-center?",
                "options": ["K", "7", "R", "4"],
                "answer": "R",
                "explanation": "The bottom row is 4, R, 9, so bottom-center is R."
            }
        ]
    },
    "Word Games": {
        "Beginner": [
            {
                "type": "Word Games",
                "difficulty": "Beginner",
                "question": "Which of these is the opposite of 'UP'?",
                "options": ["DOWN", "LEFT", "RIGHT", "HIGH"],
                "answer": "DOWN",
                "explanation": "The antonym of 'UP' is 'DOWN'."
            }
        ],
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
        "Difficult": [
            {
                "type": "Word Games",
                "difficulty": "Difficult",
                "question": "Identify the word that means 'lasting for a very short time'.",
                "options": ["Ephemeral", "Ubiquitous", "Esoteric", "Resilient"],
                "answer": "Ephemeral",
                "explanation": "'Ephemeral' means lasting for a very short time."
            }
        ],
        "Advanced": [
            {
                "type": "Word Games",
                "difficulty": "Advanced",
                "question": "What is the synonym of 'PERSPICACIOUS'?",
                "options": ["Shrewd", "Stubborn", "Transparent", "Reluctant"],
                "answer": "Shrewd",
                "explanation": "'Perspicacious' means having a ready insight and understanding (shrewd/astute)."
            }
        ]
    },
    "Pattern Recognition": {
        "Beginner": [
            {
                "type": "Pattern Recognition",
                "difficulty": "Beginner",
                "question": "What comes next: 1, 2, 3, 4, __?",
                "options": ["5", "6", "7", "8"],
                "answer": "5",
                "explanation": "Numbers increment by 1."
            }
        ],
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
                "explanation": "Each number doubles the previous one. 24 * 2 = 48."
            }
        ],
        "Difficult": [
            {
                "type": "Pattern Recognition",
                "difficulty": "Difficult",
                "question": "What is the next number in the Fibonacci sequence: 1, 1, 2, 3, 5, 8, 13, __?",
                "options": ["18", "20", "21", "24"],
                "answer": "21",
                "explanation": "The next Fibonacci term is 8 + 13 = 21."
            }
        ],
        "Advanced": [
            {
                "type": "Pattern Recognition",
                "difficulty": "Advanced",
                "question": "What is the next number: 2, 3, 5, 7, 11, 13, 17, __?",
                "options": ["19", "21", "23", "25"],
                "answer": "19",
                "explanation": "This is the prime number sequence; 19 is the next prime."
            }
        ]
    },
    "Riddles": {
        "Beginner": [
            {
                "type": "Riddles",
                "difficulty": "Beginner",
                "question": "What color is the sky on a clear sunny day?",
                "options": ["Blue", "Green", "Purple", "Red"],
                "answer": "Blue",
                "explanation": "The sky is blue on a clear day."
            }
        ],
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
        "Difficult": [
            {
                "type": "Riddles",
                "difficulty": "Difficult",
                "question": "I speak without a mouth and hear without ears. I have no body, but I come alive with wind. What am I?",
                "options": ["An echo", "A shadow", "A cloud", "A whisper"],
                "answer": "An echo",
                "explanation": "An echo returns sound without a physical body."
            }
        ],
        "Advanced": [
            {
                "type": "Riddles",
                "difficulty": "Advanced",
                "question": "The more you take, the more you leave behind. What am I?",
                "options": ["Footsteps", "Memories", "Breaths", "Time"],
                "answer": "Footsteps",
                "explanation": "The more footsteps you take, the more you leave behind."
            }
        ]
    },
    "Quick Quizzes": {
        "Beginner": [
            {
                "type": "Quick Quizzes",
                "difficulty": "Beginner",
                "question": "How many days are in a regular calendar week?",
                "options": ["5", "6", "7", "8"],
                "answer": "7",
                "explanation": "There are 7 days in a week."
            }
        ],
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
        "Difficult": [
            {
                "type": "Quick Quizzes",
                "difficulty": "Difficult",
                "question": "What element has the chemical symbol 'Au'?",
                "options": ["Silver", "Gold", "Copper", "Aluminum"],
                "answer": "Gold",
                "explanation": "'Au' comes from the Latin word for gold, 'Aurum'."
            }
        ],
        "Advanced": [
            {
                "type": "Quick Quizzes",
                "difficulty": "Advanced",
                "question": "What is the powerhouse of the eukaryotic cell responsible for ATP production?",
                "options": ["Mitochondria", "Ribosome", "Endoplasmic Reticulum", "Golgi Apparatus"],
                "answer": "Mitochondria",
                "explanation": "Mitochondria generate most of the chemical energy (ATP) needed by the cell."
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
    normalized_diff = difficulty.title().strip() if difficulty else "Medium"

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
        
    diff_fallback_map = {
        "Beginner": "Beginner",
        "Easy": "Easy",
        "Medium": "Medium",
        "Hard": "Difficult",
        "Difficult": "Difficult",
        "Advanced": "Advanced"
    }

    target_diff = diff_fallback_map.get(normalized_diff, "Medium")
    if target_diff not in FALLBACK_CHALLENGES[mapped_type]:
        target_diff = "Medium"

    pool = FALLBACK_CHALLENGES[mapped_type].get(target_diff, FALLBACK_CHALLENGES[mapped_type]["Medium"])
    challenge = random.choice(pool).copy()
    challenge["difficulty"] = normalized_diff if normalized_diff in ["Beginner", "Easy", "Medium", "Difficult", "Advanced"] else target_diff
    logger.info(f"Serving cognitive challenge for type '{mapped_type}' ({challenge['difficulty']})")
    return challenge
