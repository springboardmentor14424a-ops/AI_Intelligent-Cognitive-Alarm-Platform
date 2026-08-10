import os
import random
import json
import re

# =====================================================================
# COGNITIVE CHALLENGE GENERATOR ENGINE
# Supports Gemini LLM integration with dynamic fallback logic
# Challenge Types: Math Problems, Logic Puzzles, Memory Challenges,
#                  Word Games, Pattern Recognition, Riddles, Quick Quizzes
# Difficulties: Easy, Medium, Hard
# =====================================================================

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")

def generate_with_gemini(challenge_type: str, difficulty: str):
    """Attempt to generate a challenge using Gemini LLM if API key is configured."""
    if not GEMINI_API_KEY:
        return None
    
    try:
        # Try google-genai or google-generativeai
        import google.generativeai as genai
        genai.configure(api_key=GEMINI_API_KEY)
        model = genai.GenerativeModel('gemini-1.5-flash')
        
        prompt = f"""Generate a unique {difficulty} difficulty cognitive challenge of type '{challenge_type}'.
Return ONLY a raw JSON object (no markdown, no backticks) with keys:
"question": the question or task text
"expected_answer": short correct answer string (case-insensitive)
"hint": a helpful hint
"options": list of 4 possible answers (including the correct one) if applicable, else empty list
"""
        response = model.generate_content(prompt)
        text = response.text.strip()
        # Clean markdown wrappers if any
        if text.startswith("```"):
            text = re.sub(r"^```(?:json)?\n?", "", text)
            text = re.sub(r"\n?```$", "", text)
        data = json.loads(text)
        return {
            "challenge_type": challenge_type,
            "difficulty": difficulty,
            "question": data.get("question"),
            "expected_answer": str(data.get("expected_answer")).strip(),
            "hint": data.get("hint", ""),
            "options": data.get("options", []),
            "source": "gemini"
        }
    except Exception as e:
        print(f"Gemini LLM notice ({e}) - Falling back to dynamic rule generator.")
        return None


def generate_math_problem(difficulty: str):
    if difficulty.lower() == "easy":
        a, b = random.randint(10, 50), random.randint(10, 50)
        op = random.choice(["+", "-"])
        ans = a + b if op == "+" else a - b
        q = f"What is {a} {op} {b}?"
        hint = "Add or subtract the numbers step by step."
    elif difficulty.lower() == "hard":
        a, b, c = random.randint(12, 35), random.randint(3, 9), random.randint(15, 60)
        ans = (a * b) - c
        q = f"What is ({a} × {b}) - {c}?"
        hint = "Multiply first, then subtract."
    else:  # Medium
        a, b, c = random.randint(15, 45), random.randint(15, 45), random.randint(5, 20)
        ans = a + b - c
        q = f"What is {a} + {b} - {c}?"
        hint = "Add the first two numbers then subtract the third."
    
    return {
        "challenge_type": "Math Problems",
        "difficulty": difficulty,
        "question": q,
        "expected_answer": str(ans),
        "hint": hint,
        "options": []
    }


def generate_logic_puzzle(difficulty: str):
    if difficulty.lower() == "easy":
        puzzles = [
            {"q": "If Alex is older than Sam, and Sam is older than Robin, who is the youngest?", "ans": "Robin", "options": ["Alex", "Sam", "Robin"]},
            {"q": "A red car is faster than a blue car. The blue car is faster than a green car. Which car is slowest?", "ans": "Green", "options": ["Red", "Blue", "Green"]},
            {"q": "If today is Tuesday, what day was yesterday?", "ans": "Monday", "options": ["Sunday", "Monday", "Wednesday"]}
        ]
    elif difficulty.lower() == "hard":
        puzzles = [
            {"q": "Five runners A, B, C, D, E race. A finishes before B, but after C. D finishes before C, but after E. Who won 1st place?", "ans": "E", "options": ["A", "C", "D", "E"]},
            {"q": "A clock shows 3:15. What is the angle between the hour and minute hands? (in degrees, decimal point .5 if any)", "ans": "7.5", "options": ["0", "7.5", "15", "22.5"]},
            {"q": "If 3 cats catch 3 mice in 3 minutes, how many minutes does it take 100 cats to catch 100 mice?", "ans": "3", "options": ["3", "30", "100", "300"]}
        ]
    else:  # Medium
        puzzles = [
            {"q": "Which number comes next in the sequence: 2, 4, 8, 16, ?", "ans": "32", "options": ["24", "30", "32", "64"]},
            {"q": "If all Bloops are Razzies, and all Razzies are Lazzies, are all Bloops definitely Lazzies? (Yes/No)", "ans": "Yes", "options": ["Yes", "No"]},
            {"q": "Which number is missing: 3, 6, 11, 18, 27, ?", "ans": "38", "options": ["35", "36", "38", "40"]}
        ]
    p = random.choice(puzzles)
    return {
        "challenge_type": "Logic Puzzles",
        "difficulty": difficulty,
        "question": p["q"],
        "expected_answer": p["ans"],
        "hint": "Analyze the relationship between items step-by-step.",
        "options": p.get("options", [])
    }


def generate_memory_challenge(difficulty: str):
    if difficulty.lower() == "easy":
        code = str(random.randint(1000, 9999))
        q = f"Memorize this 4-digit security code: {code}"
    elif difficulty.lower() == "hard":
        chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"
        code = "".join(random.choice(chars) for _ in range(8))
        q = f"Memorize this 8-character passcode: {code}"
    else:  # Medium
        code = str(random.randint(100000, 999999))
        q = f"Memorize this 6-digit verification code: {code}"
        
    return {
        "challenge_type": "Memory Challenges",
        "difficulty": difficulty,
        "question": q,
        "expected_answer": code,
        "hint": "Focus on groups of 2 digits at a time.",
        "options": []
    }


def generate_word_game(difficulty: str):
    words_easy = ["WAKEUP", "SMART", "ALARM", "CLOCK", "SLEEP", "FOCUS"]
    words_med = ["COGNITIVE", "BRAINWAVE", "CIRCADIAN", "FRESHMIND", "SCHEDULE"]
    words_hard = ["NEUROPLASTICITY", "SYNCHRONIZATION", "INTELLIGENCE", "PERFORMATIVE"]
    
    if difficulty.lower() == "easy":
        word = random.choice(words_easy)
    elif difficulty.lower() == "hard":
        word = random.choice(words_hard)
    else:
        word = random.choice(words_med)
        
    letters = list(word)
    while "".join(letters) == word:
        random.shuffle(letters)
    scrambled = "".join(letters)
    
    return {
        "challenge_type": "Word Games",
        "difficulty": difficulty,
        "question": f"Unscramble this word: '{scrambled}'",
        "expected_answer": word,
        "hint": f"The original word starts with '{word[0]}'.",
        "options": []
    }


def generate_pattern_recognition(difficulty: str):
    if difficulty.lower() == "easy":
        patterns = [
            {"q": "Complete the pattern: Red, Blue, Red, Blue, ?", "ans": "Red", "options": ["Red", "Blue", "Green"]},
            {"q": "Complete the sequence: 5, 10, 15, 20, ?", "ans": "25", "options": ["22", "25", "30"]},
            {"q": "Complete the pattern: ▲, ■, ▲, ■, ?", "ans": "▲", "options": ["▲", "■", "●"]}
        ]
    elif difficulty.lower() == "hard":
        patterns = [
            {"q": "Find the next number in sequence: 1, 1, 2, 3, 5, 8, 13, ?", "ans": "21", "options": ["18", "20", "21", "25"]},
            {"q": "Find the missing number: 2, 3, 5, 7, 11, 13, ?", "ans": "17", "options": ["15", "16", "17", "19"]},
            {"q": "Complete the square sequence: 1, 4, 9, 16, 25, 36, ?", "ans": "49", "options": ["42", "48", "49", "64"]}
        ]
    else:  # Medium
        patterns = [
            {"q": "Find the next number: 2, 5, 10, 17, 26, ?", "ans": "37", "options": ["35", "36", "37", "40"]},
            {"q": "Find the next letter: A, C, E, G, ?", "ans": "I", "options": ["H", "I", "J", "K"]},
            {"q": "Complete pattern: 100, 90, 81, 73, 66, ?", "ans": "60", "options": ["58", "59", "60", "61"]}
        ]
    p = random.choice(patterns)
    return {
        "challenge_type": "Pattern Recognition",
        "difficulty": difficulty,
        "question": p["q"],
        "expected_answer": p["ans"],
        "hint": "Look at the differences between consecutive terms.",
        "options": p.get("options", [])
    }


def generate_riddle(difficulty: str):
    if difficulty.lower() == "easy":
        riddles = [
            {"q": "What has to be broken before you can use it?", "ans": "egg", "options": ["egg", "glass", "promise", "clock"]},
            {"q": "What gets wetter the more it dries?", "ans": "towel", "options": ["towel", "water", "sponge", "sun"]},
            {"q": "What has a head and a tail, but no body?", "ans": "coin", "options": ["coin", "snake", "comet", "pin"]}
        ]
    elif difficulty.lower() == "hard":
        riddles = [
            {"q": "The person who makes it has no need of it; the person who buys it has no use for it. The person who uses it can neither see nor feel it. What is it?", "ans": "coffin", "options": ["coffin", "car", "mirror", "house"]},
            {"q": "What can travel all around the world while remaining in a corner?", "ans": "stamp", "options": ["stamp", "bird", "airplane", "shadow"]},
            {"q": "I have cities, but no houses. I have mountains, but no trees. I have water, but no fish. What am I?", "ans": "map", "options": ["map", "globe", "picture", "dream"]}
        ]
    else:  # Medium
        riddles = [
            {"q": "I speak without a mouth and hear without ears. I have no body, but I come alive with wind. What am I?", "ans": "echo", "options": ["echo", "ghost", "whistle", "cloud"]},
            {"q": "What has many keys but can't open a single lock?", "ans": "piano", "options": ["piano", "keychain", "map", "door"]},
            {"q": "What belongs to you, but other people use it more than you do?", "ans": "name", "options": ["name", "money", "phone", "car"]}
        ]
    r = random.choice(riddles)
    return {
        "challenge_type": "Riddles",
        "difficulty": difficulty,
        "question": r["q"],
        "expected_answer": r["ans"],
        "hint": "Think abstractly about wordplay and metaphors.",
        "options": r.get("options", [])
    }


def generate_quick_quiz(difficulty: str):
    if difficulty.lower() == "easy":
        quizzes = [
            {"q": "How many sides does a hexagon have?", "ans": "6", "options": ["5", "6", "7", "8"]},
            {"q": "Which is the largest ocean on Earth?", "ans": "Pacific", "options": ["Atlantic", "Indian", "Pacific", "Arctic"]},
            {"q": "What color is formed by mixing Blue and Yellow?", "ans": "Green", "options": ["Purple", "Green", "Orange", "Brown"]}
        ]
    elif difficulty.lower() == "hard":
        quizzes = [
            {"q": "What is the chemical symbol for Gold?", "ans": "Au", "options": ["Ag", "Au", "Fe", "Cu"]},
            {"q": "In computer science, how many bits are in a byte?", "ans": "8", "options": ["4", "8", "16", "32"]},
            {"q": "What is the capital city of Australia?", "ans": "Canberra", "options": ["Sydney", "Melbourne", "Canberra", "Brisbane"]}
        ]
    else:  # Medium
        quizzes = [
            {"q": "Which planet in our solar system is known as the Red Planet?", "ans": "Mars", "options": ["Venus", "Mars", "Jupiter", "Saturn"]},
            {"q": "How many minutes are in 2.5 hours?", "ans": "150", "options": ["120", "130", "150", "180"]},
            {"q": "Who painted the Mona Lisa?", "ans": "Leonardo da Vinci", "options": ["Pablo Picasso", "Vincent van Gogh", "Leonardo da Vinci", "Claude Monet"]}
        ]
    qz = random.choice(quizzes)
    return {
        "challenge_type": "Quick Quizzes",
        "difficulty": difficulty,
        "question": qz["q"],
        "expected_answer": qz["ans"],
        "hint": "Recall general knowledge facts.",
        "options": qz.get("options", [])
    }


def generate_cognitive_challenge(challenge_type: str = "Math Problems", difficulty: str = "Medium"):
    """
    Main entry point to generate a cognitive challenge.
    Tries Gemini LLM first if available; falls back to dynamic generators.
    """
    # Normalize inputs
    ctype = challenge_type.strip() if challenge_type else "Math Problems"
    diff = difficulty.strip().capitalize() if difficulty else "Medium"
    if diff not in ["Easy", "Medium", "Hard"]:
        diff = "Medium"
        
    # Attempt Gemini LLM generation
    gemini_res = generate_with_gemini(ctype, diff)
    if gemini_res:
        return gemini_res
        
    # Fallback Generators
    generators = {
        "Math Problems": generate_math_problem,
        "Math Puzzle": generate_math_problem,
        "Logic Puzzles": generate_logic_puzzle,
        "Memory Challenges": generate_memory_challenge,
        "Word Games": generate_word_game,
        "Pattern Recognition": generate_pattern_recognition,
        "Riddles": generate_riddle,
        "Quick Quizzes": generate_quick_quiz
    }
    
    gen_func = generators.get(ctype, generate_math_problem)
    res = gen_func(diff)
    res["source"] = "rule_engine"
    return res


def verify_challenge_answer(expected: str, user_input: str):
    """Case-insensitive and whitespace-flexible answer verification."""
    if not expected or not user_input:
        return False
    exp_clean = str(expected).strip().lower()
    user_clean = str(user_input).strip().lower()
    
    if exp_clean == user_clean:
        return True
    
    # Allow numerical tolerance or substring inclusion for text answers
    if exp_clean in user_clean or user_clean in exp_clean:
        return True
        
    return False
