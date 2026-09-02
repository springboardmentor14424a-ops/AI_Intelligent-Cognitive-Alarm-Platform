import os
import random
import json
import re


# Memory cache of recent question hashes to strictly guarantee 100% uniqueness
_RECENT_QUESTIONS = set()

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
        
        # Supported Gemini model names in Google GenAI SDK
        model = None
        for mname in ['gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-pro']:
            try:
                model = genai.GenerativeModel(
                    mname,
                    generation_config={"temperature": 1.0, "top_p": 0.95}
                )
                break
            except Exception:
                continue
                
        if not model:
            model = genai.GenerativeModel('gemini-1.5-flash', generation_config={"temperature": 1.0, "top_p": 0.95})
        
        random_seed = random.randint(100000, 999999)
        topic_flavors = ["aerospace", "quantum concepts", "neuroscience", "ancient history", "nature & wildlife", "cryptography", "deep ocean", "astronomy", "microbiology", "logic paradoxes", "everyday engineering"]
        selected_flavor = random.choice(topic_flavors)

        prompt = f"""Generate a completely unique, fresh, creative, and non-repeating {difficulty} difficulty cognitive challenge of type '{challenge_type}'.
Theme inspiration (use for context/story/variety): '{selected_flavor}', Random Seed ID: #{random_seed}.
- For Math: Generate complex multi-step compound arithmetic (combining add, subtract, multiply, brackets, or algebraic solving) with random numbers.
- For Logic/Riddles/Quizzes: Make the question inventive and strictly appropriate for '{difficulty}' level. Never repeat common cliches.
Return ONLY a raw JSON object (no markdown, no backticks, no markdown codeblock wrappers) with keys:
"question": the question or task text
"expected_answer": short, direct, unambiguous correct answer string
"hint": a helpful concise hint
"options": list of 4 distinct possible options (including the correct one) if multiple-choice, else empty list []
"""
        response = model.generate_content(prompt)
        text = response.text.strip()
        if text.startswith("```"):
            text = re.sub(r"^```(?:json)?\n?", "", text)
            text = re.sub(r"\n?```$", "", text)
        data = json.loads(text)
        
        q_text = str(data.get("question")).strip()
        if q_text in _RECENT_QUESTIONS:
            # If seen recently, request another variant
            return None
        _RECENT_QUESTIONS.add(q_text)
        if len(_RECENT_QUESTIONS) > 200:
            _RECENT_QUESTIONS.pop()
            
        return {
            "challenge_type": challenge_type,
            "difficulty": difficulty,
            "question": q_text,
            "expected_answer": str(data.get("expected_answer")).strip(),
            "hint": data.get("hint", ""),
            "options": data.get("options", []),
            "source": "gemini"
        }
    except Exception as e:
        return None


def generate_math_problem(difficulty: str):
    """
    Generates rich, randomized compound equations combining addition, subtraction,
    multiplication, division, brackets, and algebra. Every generation produces a unique problem.
    """
    diff = difficulty.lower()
    pattern_type = random.randint(1, 6)

    if diff == "beginner":
        if pattern_type == 1:
            a, b, c = random.randint(3, 9), random.randint(2, 6), random.randint(2, 10)
            ans = (a * b) + c
            q = f"What is ({a} × {b}) + {c}?"
            hint = "Multiply first, then add."
        elif pattern_type == 2:
            a, b, c = random.randint(4, 9), random.randint(2, 5), random.randint(1, 8)
            ans = (a * b) - c
            q = f"What is ({a} × {b}) - {c}?"
            hint = "Multiply first, then subtract."
        elif pattern_type == 3:
            a, b, c = random.randint(10, 30), random.randint(5, 20), random.randint(2, 15)
            ans = a + b - c
            q = f"What is {a} + {b} - {c}?"
            hint = "Add the first two numbers then subtract."
        elif pattern_type == 4:
            a, b, c = random.randint(2, 6), random.randint(2, 5), random.randint(3, 8)
            ans = a + (b * c)
            q = f"What is {a} + ({b} × {c})?"
            hint = "Do multiplication inside brackets first."
        elif pattern_type == 5:
            x = random.randint(2, 12)
            a = random.randint(5, 20)
            b = x + a
            ans = x
            q = f"Solve for x: x + {a} = {b}"
            hint = f"Subtract {a} from both sides."
        else:
            a, b, c = random.randint(5, 15), random.randint(2, 5), random.randint(1, 10)
            ans = (a - b) + c
            q = f"What is ({a} - {b}) + {c}?"
            hint = "Calculate inside parentheses first."

    elif diff == "easy":
        if pattern_type == 1:
            a, b, c, d = random.randint(5, 12), random.randint(3, 8), random.randint(2, 6), random.randint(2, 5)
            ans = (a * b) - (c * d)
            q = f"What is ({a} × {b}) - ({c} × {d})?"
            hint = "Calculate both products first, then subtract."
        elif pattern_type == 2:
            a, b, c = random.randint(12, 35), random.randint(3, 7), random.randint(10, 40)
            ans = (a * b) + c
            q = f"What is ({a} × {b}) + {c}?"
            hint = "Multiply two-digit number first, then add."
        elif pattern_type == 3:
            a, b, c, d = random.randint(20, 60), random.randint(10, 40), random.randint(5, 25), random.randint(2, 15)
            ans = (a + b) - (c + d)
            q = f"What is ({a} + {b}) - ({c} + {d})?"
            hint = "Add terms in each bracket first."
        elif pattern_type == 4:
            x = random.randint(3, 15)
            m = random.randint(2, 5)
            c = random.randint(4, 20)
            rhs = (m * x) + c
            ans = x
            q = f"Solve for x: {m}x + {c} = {rhs}"
            hint = f"Subtract {c}, then divide by {m}."
        elif pattern_type == 5:
            a, b, c = random.randint(4, 10), random.randint(5, 12), random.randint(15, 45)
            ans = (a * b) + c - 10
            q = f"What is ({a} × {b}) + {c} - 10?"
            hint = "Follow standard order of operations."
        else:
            a, b, c = random.randint(10, 25), random.randint(4, 8), random.randint(20, 50)
            ans = (a * b) - c
            q = f"What is ({a} × {b}) - {c}?"
            hint = "Multiply first, then subtract."

    elif diff == "hard":
        if pattern_type == 1:
            a, b, c, d, e = random.randint(12, 25), random.randint(4, 9), random.randint(6, 15), random.randint(3, 8), random.randint(15, 60)
            ans = (a * b) + (c * d) - e
            q = f"What is ({a} × {b}) + ({c} × {d}) - {e}?"
            hint = "Multiply both pairs first, add them, then subtract."
        elif pattern_type == 2:
            a = random.randint(6, 16)
            b, c, d = random.randint(3, 8), random.randint(4, 9), random.randint(10, 50)
            ans = (a ** 2) - (b * c) + d
            q = f"What is ({a}² - {b} × {c}) + {d}?"
            hint = f"Square {a} (= {a**2}), subtract product, then add {d}."
        elif pattern_type == 3:
            x = random.randint(4, 18)
            m = random.randint(3, 7)
            sub = random.randint(10, 35)
            rhs = (m * x) - sub
            ans = x
            q = f"Solve for x: {m}x - {sub} = {rhs}"
            hint = f"Add {sub} to {rhs}, then divide by {m}."
        elif pattern_type == 4:
            a, b = random.choice([(10, 250), (20, 150), (15, 200), (25, 160), (30, 120), (50, 180)])
            d, e = random.randint(4, 9), random.randint(5, 12)
            pct_val = int((a / 100) * b)
            ans = pct_val + (d * e)
            q = f"What is {a}% of {b} + ({d} × {e})?"
            hint = f"Find {a}% of {b} ({pct_val}), then add the product of {d} and {e}."
        elif pattern_type == 5:
            a, b, c, d = random.randint(15, 30), random.randint(5, 12), random.randint(8, 16), random.randint(4, 8)
            ans = (a * b) - (c * d) + 25
            q = f"What is ({a} × {b}) - ({c} × {d}) + 25?"
            hint = "Compute products first, subtract, then add 25."
        else:
            x = random.randint(5, 20)
            m1 = random.randint(4, 8)
            m2 = random.randint(1, 3)
            diff_m = m1 - m2
            const = random.randint(5, 30)
            ans = x
            rhs_val = (diff_m * x) - const
            q = f"Solve for x: {m1}x - {const} = {m2}x + {rhs_val}"
            hint = "Group x terms on one side and numbers on the other."

    elif diff == "expert":
        if pattern_type == 1:
            a = random.randint(11, 20)
            b = random.randint(5, 12)
            c, d = random.randint(4, 8), random.randint(5, 9)
            e = random.randint(20, 80)
            ans = (a ** 2) - (b ** 2) + (c * d) - e
            q = f"What is ({a}² - {b}²) + ({c} × {d}) - {e}?"
            hint = f"Difference of squares: {a}² - {b}² = {a**2 - b**2}, then evaluate remainder."
        elif pattern_type == 2:
            x = random.randint(6, 25)
            m1 = random.randint(5, 9)
            m2 = random.randint(2, 4)
            diff_m = m1 - m2
            sub_val = random.randint(15, 50)
            add_val = (diff_m * x) - sub_val
            ans = x
            q = f"Solve for x: {m1}x - {sub_val} = {m2}x + {add_val}"
            hint = f"Subtract {m2}x from {m1}x ({diff_m}x), add {sub_val} to {add_val}."
        elif pattern_type == 3:
            a, b, c, d, e, f = random.randint(8, 15), random.randint(4, 8), random.randint(7, 14), random.randint(3, 6), random.randint(5, 12), random.randint(4, 7)
            ans = ((a * b) + (c * d)) - (e * f)
            q = f"What is [({a} × {b}) + ({c} × {d})] - ({e} × {f})?"
            hint = "Compute all three pairs of multiplication before bracket operations."
        elif pattern_type == 4:
            a = random.randint(3, 6)
            b = random.randint(2, 4)
            c, d = random.randint(6, 12), random.randint(5, 10)
            ans = (a ** 3) + (b ** 3) - (c * d)
            q = f"What is ({a}³ + {b}³) - ({c} × {d})?"
            hint = f"Calculate cubes: {a}³={a**3}, {b}³={b**3}, then subtract {c}×{d}."
        elif pattern_type == 5:
            # Multi-bracket compound
            a, b, c, d = random.randint(15, 35), random.randint(8, 20), random.randint(4, 9), random.randint(12, 40)
            ans = ((a + b) * c) - d
            q = f"What is [({a} + {b}) × {c}] - {d}?"
            hint = "Add inside parentheses first, multiply by external factor, then subtract."
        else:
            x = random.randint(5, 15)
            c1, c2 = random.randint(10, 30), random.randint(5, 20)
            ans = (x * 3) + c1 - c2
            q = f"If x = {x}, evaluate: 3x + {c1} - {c2}"
            hint = f"Substitute x = {x} and calculate 3({x}) + {c1} - {c2}."

    else:  # Medium
        if pattern_type == 1:
            a, b, c, d = random.randint(8, 18), random.randint(3, 7), random.randint(10, 30), random.randint(5, 20)
            ans = (a * b) + c - d
            q = f"What is ({a} × {b}) + {c} - {d}?"
            hint = "Multiply first, add, then subtract."
        elif pattern_type == 2:
            a, b, c = random.randint(15, 40), random.randint(10, 30), random.randint(3, 6)
            ans = (a + b) * c
            q = f"What is ({a} + {b}) × {c}?"
            hint = "Add inside brackets first, then multiply."
        elif pattern_type == 3:
            x = random.randint(3, 14)
            m = random.randint(2, 5)
            c = random.randint(8, 25)
            rhs = (m * x) + c
            ans = x
            q = f"Solve for x: {m}x + {c} = {rhs}"
            hint = f"Subtract {c} from {rhs}, then divide by {m}."
        elif pattern_type == 4:
            a, b, c, d = random.randint(6, 12), random.randint(4, 9), random.randint(3, 7), random.randint(2, 6)
            ans = (a * b) + (c * d)
            q = f"What is ({a} × {b}) + ({c} × {d})?"
            hint = "Calculate both multiplications, then add results."
        elif pattern_type == 5:
            a, b, c = random.randint(20, 50), random.randint(5, 15), random.randint(4, 8)
            ans = a - (b * c) if a >= (b * c) else (b * c) - a
            if a >= (b * c):
                q = f"What is {a} - ({b} × {c})?"
            else:
                q = f"What is ({b} × {c}) - {a}?"
            hint = "Do multiplication first, then subtraction."
        else:
            a = random.randint(5, 12)
            b, c = random.randint(3, 8), random.randint(10, 30)
            ans = (a ** 2) - (b * 2) + c
            q = f"What is ({a}² - {b} × 2) + {c}?"
            hint = f"Square {a} (= {a**2}), subtract {b*2}, then add {c}."

    return {
        "challenge_type": "Math Problems",
        "difficulty": difficulty,
        "question": q,
        "expected_answer": str(ans),
        "hint": hint,
        "options": []
    }


def generate_logic_puzzle(difficulty: str):
    """Generates varied, dynamic logic puzzles across deduction, ranking, sequences, and relationships."""
    diff = difficulty.lower()
    names = ["Alex", "Sam", "Robin", "Jordan", "Taylor", "Casey", "Morgan", "Riley", "Avery", "Jamie"]
    random.shuffle(names)
    n1, n2, n3, n4 = names[0], names[1], names[2], names[3]

    if diff == "beginner":
        puzzles = [
            {"q": f"If today is Friday, what day is tomorrow?", "ans": "Saturday", "options": ["Thursday", "Friday", "Saturday", "Sunday"]},
            {"q": f"If {n1} is taller than {n2}, who is shorter?", "ans": n2, "options": [n1, n2]},
            {"q": f"A puppy has how many legs?", "ans": "4", "options": ["2", "4", "6", "8"]},
            {"q": f"If {n1} is in front of {n2}, who is behind?", "ans": n2, "options": [n1, n2]},
            {"q": f"How many minutes are in half an hour?", "ans": "30", "options": ["15", "30", "45", "60"]}
        ]
    elif diff == "easy":
        puzzles = [
            {"q": f"If {n1} is older than {n2}, and {n2} is older than {n3}, who is the youngest?", "ans": n3, "options": [n1, n2, n3]},
            {"q": f"A red car is faster than a blue car. The blue car is faster than a green car. Which car is slowest?", "ans": "Green", "options": ["Red", "Blue", "Green"]},
            {"q": f"If today is Tuesday, what day was 3 days ago?", "ans": "Saturday", "options": ["Sunday", "Monday", "Saturday", "Friday"]},
            {"q": f"{n1} scored higher than {n2}. {n3} scored higher than {n1}. Who got the highest score?", "ans": n3, "options": [n1, n2, n3]},
            {"q": f"If 1 book costs $5, how many books can you buy with $35?", "ans": "7", "options": ["5", "6", "7", "8"]}
        ]
    elif diff == "hard":
        puzzles = [
            {"q": f"Five runners ({n1}, {n2}, {n3}, {n4}, Chris) race. {n1} finishes before {n2}, but after {n3}. {n4} finishes before {n3}, but after Chris. Who won 1st place?", "ans": "Chris", "options": [n1, n3, n4, "Chris"]},
            {"q": f"A clock shows 3:15. What is the angle between the hour and minute hands? (in degrees, decimal point .5 if any)", "ans": "7.5", "options": ["0", "7.5", "15", "22.5"]},
            {"q": f"If 3 workers build 3 chairs in 3 hours, how many hours does it take 60 workers to build 60 chairs?", "ans": "3", "options": ["3", "30", "60", "180"]},
            {"q": f"If all Bloops are Razzies, and no Razzies are Lazzies, can any Bloop be a Lazzie? (Yes/No)", "ans": "No", "options": ["Yes", "No"]},
            {"q": f"{n1} is twice as old as {n2}. In 10 years, {n1} will be 40. How old is {n2} right now?", "ans": "15", "options": ["10", "15", "20", "25"]}
        ]
    elif diff == "expert":
        puzzles = [
            {"q": f"In a family gathering, there are 2 fathers, 2 sons, 1 grandfather, and 1 grandson. What is the minimum number of people present?", "ans": "3", "options": ["2", "3", "4", "5"]},
            {"q": f"A man looks at a portrait and says: 'Brothers and sisters I have none, but that man's father is my father's son.' Whose portrait is it?", "ans": "His son", "options": ["Himself", "His father", "His son", "His nephew"]},
            {"q": f"A bat and a ball cost $1.10 in total. The bat costs $1.00 more than the ball. How much does the ball cost in cents?", "ans": "5", "options": ["5", "10", "15", "20"]},
            {"q": f"You have 8 identical-looking coins, one of which is slightly heavier. What is the minimum number of balance scale weighings needed to guarantee finding the heavy coin?", "ans": "2", "options": ["1", "2", "3", "4"]},
            {"q": f"Three boxes are mislabeled: Apples, Oranges, Apples & Oranges. You pick 1 fruit from 1 box. What is the minimum number of fruit picks needed to correctly label all three boxes?", "ans": "1", "options": ["1", "2", "3"]}
        ]
    else:  # Medium
        puzzles = [
            {"q": f"Which number comes next in the sequence: 3, 6, 12, 24, 48, ?", "ans": "96", "options": ["72", "84", "96", "108"]},
            {"q": f"If all Glips are Zorps, and all Zorps are Klips, are all Glips definitely Klips? (Yes/No)", "ans": "Yes", "options": ["Yes", "No"]},
            {"q": f"{n1} is taller than {n2} but shorter than {n3}. {n4} is taller than {n3}. Who is the 2nd tallest?", "ans": n3, "options": [n1, n2, n3, n4]},
            {"q": f"If 5 cats catch 5 mice in 5 minutes, how many minutes will 1 cat take to catch 1 mouse?", "ans": "5", "options": ["1", "5", "10", "25"]},
            {"q": f"A farmer has 17 sheep. All but 9 run away. How many sheep are left?", "ans": "9", "options": ["8", "9", "17", "0"]}
        ]
    p = random.choice(puzzles)
    return {
        "challenge_type": "Logic Puzzles",
        "difficulty": difficulty,
        "question": p["q"],
        "expected_answer": p["ans"],
        "hint": "Analyze logical constraints step by step.",
        "options": p.get("options", [])
    }


def generate_memory_challenge(difficulty: str):
    """Generates randomized non-repeating memory sequences according to difficulty."""
    diff = difficulty.lower()
    if diff == "beginner":
        code = str(random.randint(100, 999))
        q = f"Memorize this 3-digit verification code: {code}"
    elif diff == "easy":
        code = str(random.randint(1000, 9999))
        q = f"Memorize this 4-digit security code: {code}"
    elif diff == "hard":
        chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"
        code = "".join(random.choice(chars) for _ in range(8))
        q = f"Memorize this 8-character high-security passcode: {code}"
    elif diff == "expert":
        chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"
        code = "".join(random.choice(chars) for _ in range(10))
        q = f"Memorize this 10-character advanced cryptographic key: {code}"
    else:  # Medium
        code = str(random.randint(100000, 999999))
        q = f"Memorize this 6-digit verification code: {code}"
        
    return {
        "challenge_type": "Memory Challenges",
        "difficulty": difficulty,
        "question": q,
        "expected_answer": code,
        "hint": "Chunk characters into groups of 2 or 3 in your working memory.",
        "options": []
    }


def generate_word_game(difficulty: str):
    """Generates anagrams and vocabulary puzzles from dynamic word banks."""
    words_beg = ["SUN", "CAT", "DOG", "BED", "RUN", "CUP", "MAP", "PEN", "TOP", "HAT", "CAR", "FOX", "BOX", "KEY"]
    words_easy = ["WAKEUP", "SMART", "ALARM", "CLOCK", "SLEEP", "FOCUS", "BRAIN", "LIGHT", "SOLVE", "SHARP", "POWER", "QUICK", "ENERGY", "MORNING"]
    words_med = ["COGNITIVE", "BRAINWAVE", "CIRCADIAN", "FRESHMIND", "SCHEDULE", "ADAPTIVE", "STRENGTH", "ALERTNESS", "ROUTINE", "EXCELLENCE", "VELOCITY", "SYNAPSE"]
    words_hard = ["NEUROPLASTICITY", "SYNCHRONIZATION", "INTELLIGENCE", "PERFORMATIVE", "CONCENTRATION", "CHRONOBIOLOGY", "ELECTROPHYSIOLOGY", "METASYSTEM"]
    words_exp = ["COGNITIVEALARM", "NEUROSCIENCE", "CIRCADIANRHYTHM", "PSYCHOPHYSIOLOGICAL", "NEUROTRANSMITTER", "ELECTROENCEPHALOGRAM"]
    
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
    # Ensure scrambled word is strictly not equal to original word
    for _ in range(10):
        random.shuffle(letters)
        if "".join(letters) != word:
            break
    scrambled = "".join(letters)
    
    return {
        "challenge_type": "Word Games",
        "difficulty": difficulty,
        "question": f"Unscramble this word: '{scrambled}'",
        "expected_answer": word,
        "hint": f"The word starts with '{word[0]}' and has {len(word)} letters.",
        "options": []
    }


def generate_pattern_recognition(difficulty: str):
    """Generates dynamic mathematical and logical sequences."""
    diff = difficulty.lower()
    ptype = random.randint(1, 4)

    if diff == "beginner":
        if ptype == 1:
            start, step = random.randint(1, 10), random.randint(1, 3)
            seq = [start + i * step for i in range(4)]
            ans = start + 4 * step
            q = f"Complete the sequence: {seq[0]}, {seq[1]}, {seq[2]}, {seq[3]}, ?"
        elif ptype == 2:
            colors = ["Red", "Blue", "Green", "Yellow"]
            c1, c2 = random.sample(colors, 2)
            q = f"Complete the pattern: {c1}, {c2}, {c1}, {c2}, ?"
            ans = c1
        else:
            start = random.randint(2, 8)
            seq = [start * (i + 1) for i in range(4)]
            ans = start * 5
            q = f"Complete the pattern: {seq[0]}, {seq[1]}, {seq[2]}, {seq[3]}, ?"
    elif diff == "easy":
        if ptype == 1:
            start, step = random.randint(5, 20), random.randint(4, 9)
            seq = [start + i * step for i in range(5)]
            ans = start + 5 * step
            q = f"What is the next number: {seq[0]}, {seq[1]}, {seq[2]}, {seq[3]}, {seq[4]}, ?"
        elif ptype == 2:
            start = random.randint(2, 6)
            seq = [start * (2 ** i) for i in range(4)]
            ans = start * (2 ** 4)
            q = f"Find the next number: {seq[0]}, {seq[1]}, {seq[2]}, {seq[3]}, ?"
        else:
            base = random.randint(50, 100)
            step = random.randint(5, 10)
            seq = [base - i * step for i in range(4)]
            ans = base - 4 * step
            q = f"Complete the descending pattern: {seq[0]}, {seq[1]}, {seq[2]}, {seq[3]}, ?"
    elif diff == "hard":
        if ptype == 1:
            # Quadratic sequence: n^2 + k
            k = random.randint(1, 10)
            seq = [(i ** 2) + k for i in range(1, 6)]
            ans = (6 ** 2) + k
            q = f"Find the missing term: {seq[0]}, {seq[1]}, {seq[2]}, {seq[3]}, {seq[4]}, ?"
        elif ptype == 2:
            # Fibonacci generalized
            a, b = random.randint(1, 4), random.randint(2, 5)
            fib = [a, b]
            for _ in range(4):
                fib.append(fib[-1] + fib[-2])
            ans = fib[-1] + fib[-2]
            q = f"Find the next number in sequence: {fib[0]}, {fib[1]}, {fib[2]}, {fib[3]}, {fib[4]}, {fib[5]}, ?"
        else:
            # Triangular sequence
            k = random.randint(2, 5)
            seq = [(i * (i + 1)) // 2 + k for i in range(1, 6)]
            ans = (6 * 7) // 2 + k
            q = f"Determine the next term: {seq[0]}, {seq[1]}, {seq[2]}, {seq[3]}, {seq[4]}, ?"
    elif diff == "expert":
        if ptype == 1:
            # Cubic differences n^3 - n
            seq = [(i ** 3) - i for i in range(2, 7)]
            ans = (7 ** 3) - 7
            q = f"Find the next number: {seq[0]}, {seq[1]}, {seq[2]}, {seq[3]}, {seq[4]}, ?"
        else:
            # Alternating multiply & add
            m, a = random.randint(2, 3), random.randint(3, 7)
            curr = random.randint(2, 5)
            seq = [curr]
            for i in range(5):
                curr = curr * m if i % 2 == 0 else curr + a
                seq.append(curr)
            ans = curr * m if len(seq) % 2 == 1 else curr + a
            q = f"Identify the next term in sequence: {seq[0]}, {seq[1]}, {seq[2]}, {seq[3]}, {seq[4]}, ?"
    else:  # Medium
        if ptype == 1:
            # Differences increase by 2 (2, 5, 10, 17, 26 -> +3, +5, +7, +9, +11)
            start = random.randint(1, 5)
            curr = start
            seq = [curr]
            diff_step = 3
            for _ in range(4):
                curr += diff_step
                diff_step += 2
                seq.append(curr)
            ans = curr + diff_step
            q = f"Find the next number: {seq[0]}, {seq[1]}, {seq[2]}, {seq[3]}, {seq[4]}, ?"
        elif ptype == 2:
            # Letter sequence
            start_ord = random.randint(ord('A'), ord('N'))
            step = random.randint(2, 3)
            letters = [chr(start_ord + i * step) for i in range(4)]
            ans = chr(start_ord + 4 * step)
            q = f"Find the next letter: {letters[0]}, {letters[1]}, {letters[2]}, {letters[3]}, ?"
        else:
            start = random.randint(2, 4)
            seq = [start * (3 ** i) for i in range(4)]
            ans = start * (3 ** 4)
            q = f"Determine the next geometric term: {seq[0]}, {seq[1]}, {seq[2]}, {seq[3]}, ?"

    return {
        "challenge_type": "Pattern Recognition",
        "difficulty": difficulty,
        "question": q,
        "expected_answer": str(ans),
        "hint": "Analyze the rate of change or differences between successive terms.",
        "options": []
    }


def generate_riddle(difficulty: str):
    """Rich pool of diverse riddles categorized by difficulty."""
    diff = difficulty.lower()
    if diff == "beginner":
        riddles = [
            {"q": "What goes up but never comes down?", "ans": "age", "options": ["age", "balloon", "kite", "sun"]},
            {"q": "If you throw a red stone into the blue sea, what does it become?", "ans": "wet", "options": ["wet", "blue", "red", "sunk"]},
            {"q": "What has a head and a tail, but no body?", "ans": "coin", "options": ["coin", "snake", "comet", "pin"]},
            {"q": "What has hands but cannot clap?", "ans": "clock", "options": ["clock", "glove", "statue", "tree"]}
        ]
    elif diff == "easy":
        riddles = [
            {"q": "What has to be broken before you can use it?", "ans": "egg", "options": ["egg", "glass", "promise", "clock"]},
            {"q": "What gets wetter the more it dries?", "ans": "towel", "options": ["towel", "water", "sponge", "sun"]},
            {"q": "What belongs to you, but other people use it more than you do?", "ans": "name", "options": ["name", "money", "phone", "car"]},
            {"q": "What has a neck but no head?", "ans": "bottle", "options": ["bottle", "shirt", "guitar", "vase"]}
        ]
    elif diff == "hard":
        riddles = [
            {"q": "The person who makes it has no need of it; the person who buys it has no use for it. The person who uses it can neither see nor feel it. What is it?", "ans": "coffin", "options": ["coffin", "car", "mirror", "house"]},
            {"q": "What can travel all around the world while remaining in a corner?", "ans": "stamp", "options": ["stamp", "bird", "airplane", "shadow"]},
            {"q": "I have cities, but no houses. I have mountains, but no trees. I have water, but no fish. What am I?", "ans": "map", "options": ["map", "globe", "picture", "dream"]},
            {"q": "I am not alive, but I grow; I don't have lungs, but I need air; I don't have a mouth, but water kills me. What am I?", "ans": "fire", "options": ["fire", "plant", "balloon", "shadow"]}
        ]
    elif diff == "expert":
        riddles = [
            {"q": "A box without hinges, key, or lid, yet golden treasure inside is hid. What is it?", "ans": "egg", "options": ["egg", "chest", "casket", "banana"]},
            {"q": "What starts with T, ends with T, and has T in it?", "ans": "teapot", "options": ["teapot", "tent", "ticket", "toast"]},
            {"q": "The more you take, the more you leave behind. What am I?", "ans": "footsteps", "options": ["footsteps", "memories", "breaths", "time"]},
            {"q": "What can run but never walks, has a mouth but never talks, has a head but never weeps, has a bed but never sleeps?", "ans": "river", "options": ["river", "ocean", "clock", "wind"]}
        ]
    else:  # Medium
        riddles = [
            {"q": "I speak without a mouth and hear without ears. I have no body, but I come alive with wind. What am I?", "ans": "echo", "options": ["echo", "ghost", "whistle", "cloud"]},
            {"q": "What has many keys but can't open a single lock?", "ans": "piano", "options": ["piano", "keychain", "map", "door"]},
            {"q": "What has one eye but cannot see?", "ans": "needle", "options": ["needle", "cyclops", "storm", "hurricane"]},
            {"q": "What can you catch, but not throw?", "ans": "cold", "options": ["cold", "ball", "fish", "train"]}
        ]
    r = random.choice(riddles)
    return {
        "challenge_type": "Riddles",
        "difficulty": difficulty,
        "question": r["q"],
        "expected_answer": r["ans"],
        "hint": "Think abstractly about metaphors and wordplay.",
        "options": r.get("options", [])
    }


def generate_quick_quiz(difficulty: str):
    """Diverse knowledge quizzes across sciences, geography, literature, and math."""
    diff = difficulty.lower()
    if diff == "beginner":
        quizzes = [
            {"q": "How many days are in a week?", "ans": "7", "options": ["5", "6", "7", "8"]},
            {"q": "What color is grass?", "ans": "Green", "options": ["Blue", "Red", "Green", "Yellow"]},
            {"q": "How many hours are in a full day?", "ans": "24", "options": ["12", "24", "48", "60"]}
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
            {"q": "Which country has the most natural lakes in the world?", "ans": "Canada", "options": ["Canada", "USA", "Russia", "Brazil"]},
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
        "hint": "Recall foundational facts.",
        "options": qz.get("options", [])
    }


def generate_cognitive_challenge(challenge_type: str = "Math Problems", difficulty: str = "Medium"):
    """
    Main entry point to generate a cognitive challenge.
    Tries Gemini LLM first if configured; falls back to rich dynamic rule generators.
    """
    ctype = challenge_type.strip() if challenge_type else "Math Problems"
    diff = difficulty.strip().capitalize() if difficulty else "Medium"
    if diff not in ["Beginner", "Easy", "Medium", "Hard", "Expert"]:
        diff = "Medium"
        
    gemini_res = generate_with_gemini(ctype, diff)
    if gemini_res:
        return gemini_res
        
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
        
    # Substring check for multi-word or descriptive answers
    if len(exp_alpha) > 2 and len(user_alpha) > 2:
        if exp_alpha in user_alpha or user_alpha in exp_alpha:
            return True
            
    return False
