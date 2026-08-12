import os
import random
import json
import re
def generate_with_gemini(challenge_type: str, difficulty: str):
    """Attempt to generate a challenge using Gemini LLM if API key is configured."""
    api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    if not api_key:
        try:
            from config import Config
            api_key = getattr(Config, "GEMINI_API_KEY", None) or getattr(Config, "GOOGLE_API_KEY", None)
        except Exception:
            pass
    if not api_key:
        return None
    
    try:
        import google.generativeai as genai
        genai.configure(api_key=api_key)
        
        model = None
        for mname in ['gemini-3.5-flash', 'gemini-3.6-flash', 'gemini-flash-latest', 'models/gemini-3.5-flash']:
            try:
                model = genai.GenerativeModel(mname)
                break
            except Exception:
                continue
                
        if not model:
            model = genai.GenerativeModel('gemini-3.5-flash')
        
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
    diff = difficulty.lower()
    if diff == "beginner":
        a, b = random.randint(1, 9), random.randint(1, 9)
        op = random.choice(["+", "-"])
        ans = a + b if op == "+" else (a - b if a >= b else a + b)
        if op == "-" and a < b:
            op = "+"
        q = f"What is {a} {op} {b}?"
        hint = "Single digit calculation."
    elif diff == "easy":
        a, b = random.randint(10, 50), random.randint(10, 50)
        op = random.choice(["+", "-"])
        ans = a + b if op == "+" else a - b
        q = f"What is {a} {op} {b}?"
        hint = "Add or subtract the numbers step by step."
    elif diff == "hard":
        a, b, c = random.randint(12, 35), random.randint(3, 9), random.randint(15, 60)
        ans = (a * b) - c
        q = f"What is ({a} × {b}) - {c}?"
        hint = "Multiply first, then subtract."
    elif diff == "expert":
        a, b, c, d, e = random.randint(5, 12), random.randint(5, 12), random.randint(4, 9), random.randint(4, 9), random.randint(10, 50)
        ans = (a * b) + (c * d) - e
        q = f"What is ({a} × {b}) + ({c} × {d}) - {e}?"
        hint = "Follow BODMAS: do multiplications first, then add and subtract."
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
    diff = difficulty.lower()
    if diff == "beginner":
        puzzles = [
            {"q": "If today is Friday, what day is tomorrow?", "ans": "Saturday", "options": ["Thursday", "Friday", "Saturday"]},
            {"q": "If Sam is taller than Amy, who is shorter?", "ans": "Amy", "options": ["Sam", "Amy"]},
            {"q": "A puppy has how many legs?", "ans": "4", "options": ["2", "4", "6", "8"]}
        ]
    elif diff == "easy":
        puzzles = [
            {"q": "If Alex is older than Sam, and Sam is older than Robin, who is the youngest?", "ans": "Robin", "options": ["Alex", "Sam", "Robin"]},
            {"q": "A red car is faster than a blue car. The blue car is faster than a green car. Which car is slowest?", "ans": "Green", "options": ["Red", "Blue", "Green"]},
            {"q": "If today is Tuesday, what day was yesterday?", "ans": "Monday", "options": ["Sunday", "Monday", "Wednesday"]}
        ]
    elif diff == "hard":
        puzzles = [
            {"q": "Five runners A, B, C, D, E race. A finishes before B, but after C. D finishes before C, but after E. Who won 1st place?", "ans": "E", "options": ["A", "C", "D", "E"]},
            {"q": "A clock shows 3:15. What is the angle between the hour and minute hands? (in degrees, decimal point .5 if any)", "ans": "7.5", "options": ["0", "7.5", "15", "22.5"]},
            {"q": "If 3 cats catch 3 mice in 3 minutes, how many minutes does it take 100 cats to catch 100 mice?", "ans": "3", "options": ["3", "30", "100", "300"]}
        ]
    elif diff == "expert":
        puzzles = [
            {"q": "In a family, there are two fathers and two sons. What is the minimum number of people in the family?", "ans": "3", "options": ["2", "3", "4", "5"]},
            {"q": "A man is looking at a photograph of someone. His friend asks who it is. The man replies, 'Brothers and sisters I have none, but that man's father is my father's son.' Who is in the photograph?", "ans": "His son", "options": ["Himself", "His father", "His son", "His brother"]},
            {"q": "Which is heavier: a ton of bricks or a ton of feathers?", "ans": "Neither", "options": ["Bricks", "Feathers", "Neither"]}
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
    diff = difficulty.lower()
    if diff == "beginner":
        code = str(random.randint(100, 999))
        q = f"Memorize this 3-digit code: {code}"
    elif diff == "easy":
        code = str(random.randint(1000, 9999))
        q = f"Memorize this 4-digit security code: {code}"
    elif diff == "hard":
        chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"
        code = "".join(random.choice(chars) for _ in range(8))
        q = f"Memorize this 8-character passcode: {code}"
    elif diff == "expert":
        chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"
        code = "".join(random.choice(chars) for _ in range(10))
        q = f"Memorize this 10-character advanced passcode: {code}"
    else:  # Medium
        code = str(random.randint(100000, 999999))
        q = f"Memorize this 6-digit verification code: {code}"
        
    return {
        "challenge_type": "Memory Challenges",
        "difficulty": difficulty,
        "question": q,
        "expected_answer": code,
        "hint": "Focus on groups of digits.",
        "options": []
    }


def generate_word_game(difficulty: str):
    words_beg = ["CAT", "DOG", "BED", "RUN", "SUN", "UP"]
    words_easy = ["WAKEUP", "SMART", "ALARM", "CLOCK", "SLEEP", "FOCUS"]
    words_med = ["COGNITIVE", "BRAINWAVE", "CIRCADIAN", "FRESHMIND", "SCHEDULE"]
    words_hard = ["NEUROPLASTICITY", "SYNCHRONIZATION", "INTELLIGENCE", "PERFORMATIVE"]
    words_exp = ["COGNITIVEALARM", "NEUROSCIENCE", "CIRCADIANRHYTHM", "PSYCHOPHYSIOLOGICAL"]
    
    diff = difficulty.lower()
    if diff == "beginner":
        word = random.choice(words_beg)
    elif diff == "easy":
        word = random.choice(words_easy)
    elif diff == "hard":
        word = random.choice(words_hard)
    elif diff == "expert":
        word = random.choice(words_exp)
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
    diff = difficulty.lower()
    if diff == "beginner":
        patterns = [
            {"q": "Complete the pattern: Red, Blue, Red, Blue, ?", "ans": "Red", "options": ["Red", "Blue", "Green"]},
            {"q": "Complete the sequence: 1, 2, 3, 4, ?", "ans": "5", "options": ["4", "5", "6"]},
            {"q": "Complete the pattern: ▲, ■, ▲, ■, ?", "ans": "▲", "options": ["▲", "■", "●"]}
        ]
    elif diff == "easy":
        patterns = [
            {"q": "Complete the sequence: 5, 10, 15, 20, ?", "ans": "25", "options": ["22", "25", "30"]},
            {"q": "Complete the pattern: Up, Down, Up, Down, ?", "ans": "Up", "options": ["Up", "Down", "Left", "Right"]},
            {"q": "Complete the pattern: 2, 4, 6, 8, ?", "ans": "10", "options": ["9", "10", "12"]}
        ]
    elif diff == "hard":
        patterns = [
            {"q": "Find the next number in sequence: 1, 1, 2, 3, 5, 8, 13, ?", "ans": "21", "options": ["18", "20", "21", "25"]},
            {"q": "Find the missing number: 2, 3, 5, 7, 11, 13, ?", "ans": "17", "options": ["15", "16", "17", "19"]},
            {"q": "Complete the square sequence: 1, 4, 9, 16, 25, 36, ?", "ans": "49", "options": ["42", "48", "49", "64"]}
        ]
    elif diff == "expert":
        patterns = [
            {"q": "Find the next term: 0, 1, 3, 6, 10, 15, ?", "ans": "21", "options": ["18", "20", "21", "25"]},
            {"q": "Find next number: 1, 4, 9, 61, 52, 63, 94, ?", "ans": "46", "options": ["18", "46", "25", "36"]}
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
    diff = difficulty.lower()
    if diff == "beginner":
        riddles = [
            {"q": "What goes up but never comes down?", "ans": "age", "options": ["age", "balloon", "kite", "sun"]},
            {"q": "If you throw a red stone into the blue sea, what does it become?", "ans": "wet", "options": ["wet", "blue", "red", "sunk"]},
            {"q": "What has a head and a tail, but no body?", "ans": "coin", "options": ["coin", "snake", "comet", "pin"]}
        ]
    elif diff == "easy":
        riddles = [
            {"q": "What has to be broken before you can use it?", "ans": "egg", "options": ["egg", "glass", "promise", "clock"]},
            {"q": "What gets wetter the more it dries?", "ans": "towel", "options": ["towel", "water", "sponge", "sun"]},
            {"q": "What belongs to you, but other people use it more than you do?", "ans": "name", "options": ["name", "money", "phone", "car"]}
        ]
    elif diff == "hard":
        riddles = [
            {"q": "The person who makes it has no need of it; the person who buys it has no use for it. The person who uses it can neither see nor feel it. What is it?", "ans": "coffin", "options": ["coffin", "car", "mirror", "house"]},
            {"q": "What can travel all around the world while remaining in a corner?", "ans": "stamp", "options": ["stamp", "bird", "airplane", "shadow"]},
            {"q": "I have cities, but no houses. I have mountains, but no trees. I have water, but no fish. What am I?", "ans": "map", "options": ["map", "globe", "picture", "dream"]}
        ]
    elif diff == "expert":
        riddles = [
            {"q": "I am not alive, but I grow; I don't have lungs, but I need air; I don't have a mouth, but water kills me. What am I?", "ans": "fire", "options": ["fire", "plant", "balloon", "shadow"]},
            {"q": "A box without hinges, key, or lid, yet golden treasure inside is hid. What is it?", "ans": "egg", "options": ["egg", "chest", "casket", "banana"]},
            {"q": "What starts with T, ends with T, and has T in it?", "ans": "teapot", "options": ["teapot", "tent", "ticket", "toast"]}
        ]
    else:  # Medium
        riddles = [
            {"q": "I speak without a mouth and hear without ears. I have no body, but I come alive with wind. What am I?", "ans": "echo", "options": ["echo", "ghost", "whistle", "cloud"]},
            {"q": "What has many keys but can't open a single lock?", "ans": "piano", "options": ["piano", "keychain", "map", "door"]},
            {"q": "What has one eye but cannot see?", "ans": "needle", "options": ["needle", "cyclops", "storm", "hurricane"]}
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
    diff = difficulty.lower()
    if diff == "beginner":
        quizzes = [
            {"q": "How many days are in a week?", "ans": "7", "options": ["5", "6", "7", "8"]},
            {"q": "What color is grass?", "ans": "Green", "options": ["Blue", "Red", "Green", "Yellow"]},
            {"q": "How many legs does a dog have?", "ans": "4", "options": ["2", "4", "6", "8"]}
        ]
    elif diff == "easy":
        quizzes = [
            {"q": "How many sides does a hexagon have?", "ans": "6", "options": ["5", "6", "7", "8"]},
            {"q": "Which is the largest ocean on Earth?", "ans": "Pacific", "options": ["Atlantic", "Indian", "Pacific", "Arctic"]},
            {"q": "What color is formed by mixing Blue and Yellow?", "ans": "Green", "options": ["Purple", "Green", "Orange", "Brown"]}
        ]
    elif diff == "hard":
        quizzes = [
            {"q": "What is the chemical symbol for Gold?", "ans": "Au", "options": ["Ag", "Au", "Fe", "Cu"]},
            {"q": "In computer science, how many bits are in a byte?", "ans": "8", "options": ["4", "8", "16", "32"]},
            {"q": "What is the capital city of Australia?", "ans": "Canberra", "options": ["Sydney", "Melbourne", "Canberra", "Brisbane"]}
        ]
    elif diff == "expert":
        quizzes = [
            {"q": "Which country has the most natural lakes?", "ans": "Canada", "options": ["Canada", "USA", "Russia", "Brazil"]},
            {"q": "What is the speed of light in vacuum? (in km/s approximately)", "ans": "300000", "options": ["150000", "300000", "450000", "600000"]},
            {"q": "Who wrote 'Hamlet'?", "ans": "William Shakespeare", "options": ["Charles Dickens", "William Shakespeare", "Mark Twain", "Jane Austen"]}
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
    if diff not in ["Beginner", "Easy", "Medium", "Hard", "Expert"]:
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


def verify_challenge_answer(expected: str, user_input: str) -> bool:
    """Case-insensitive, whitespace-flexible, and numeric-aware answer verification."""
    if expected is None or user_input is None:
        return False
    
    exp_str = str(expected).strip().lower()
    user_str = str(user_input).strip().lower()
    
    if not exp_str or not user_str:
        return False
        
    if exp_str == user_str:
        return True

    # Numeric check
    try:
        if abs(float(exp_str) - float(user_str)) < 1e-4:
            return True
    except ValueError:
        pass
        
    # Strip non-alphanumeric for text checks
    exp_alpha = re.sub(r'[^a-z0-9]', '', exp_str)
    user_alpha = re.sub(r'[^a-z0-9]', '', user_str)
    if exp_alpha and user_alpha and exp_alpha == user_alpha:
        return True
        
    # Substring check for multi-word or descriptive answers (only if length > 2)
    if len(exp_alpha) > 2 and len(user_alpha) > 2:
        if exp_alpha in user_alpha or user_alpha in exp_alpha:
            return True
            
    return False
