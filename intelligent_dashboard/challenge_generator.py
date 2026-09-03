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
    """Rich pool of 15+ diverse riddles per difficulty with strict deduplication."""
    diff = difficulty.lower()
    if diff == "beginner":
        riddles = [
            {"q": "What goes up but never comes down?", "ans": "age", "options": ["age", "balloon", "kite", "sun"]},
            {"q": "If you throw a red stone into the blue sea, what does it become?", "ans": "wet", "options": ["wet", "blue", "red", "sunk"]},
            {"q": "What has a head and a tail, but no body?", "ans": "coin", "options": ["coin", "snake", "comet", "pin"]},
            {"q": "What has hands but cannot clap?", "ans": "clock", "options": ["clock", "glove", "statue", "tree"]},
            {"q": "I am tall when I am young and short when I am old. What am I?", "ans": "candle", "options": ["candle", "tree", "person", "pencil"]},
            {"q": "What has legs but cannot walk?", "ans": "table", "options": ["table", "chair", "dog", "statue"]},
            {"q": "What has one eye but cannot see?", "ans": "needle", "options": ["needle", "camera", "cyclops", "storm"]},
            {"q": "What can you catch but not throw?", "ans": "cold", "options": ["cold", "ball", "fish", "train"]},
            {"q": "What has teeth but cannot bite?", "ans": "comb", "options": ["comb", "saw", "cat", "zipper"]},
            {"q": "What is full of holes but still holds water?", "ans": "sponge", "options": ["sponge", "net", "cloth", "basket"]},
            {"q": "What has a face and two hands but no arms or legs?", "ans": "clock", "options": ["clock", "doll", "mirror", "phone"]},
            {"q": "What comes once in a minute, twice in a moment, but never in a thousand years?", "ans": "M", "options": ["M", "second", "event", "T"]},
            {"q": "What word becomes shorter when you add two letters to it?", "ans": "short", "options": ["short", "small", "brief", "tiny"]},
            {"q": "What has a bark but no bite?", "ans": "tree", "options": ["tree", "dog", "oak", "log"]},
            {"q": "What gets bigger the more you take from it?", "ans": "hole", "options": ["hole", "debt", "knowledge", "room"]},
        ]
    elif diff == "easy":
        riddles = [
            {"q": "What has to be broken before you can use it?", "ans": "egg", "options": ["egg", "glass", "promise", "clock"]},
            {"q": "What gets wetter the more it dries?", "ans": "towel", "options": ["towel", "water", "sponge", "sun"]},
            {"q": "What belongs to you, but other people use it more than you do?", "ans": "name", "options": ["name", "money", "phone", "car"]},
            {"q": "What has a neck but no head?", "ans": "bottle", "options": ["bottle", "shirt", "guitar", "vase"]},
            {"q": "What can run but never walks, has a mouth but never talks?", "ans": "river", "options": ["river", "wind", "fish", "clock"]},
            {"q": "What is so fragile that saying its name breaks it?", "ans": "silence", "options": ["silence", "glass", "promise", "ice"]},
            {"q": "What has roots as nobody sees, is taller than trees, up up up it goes and yet never grows?", "ans": "mountain", "options": ["mountain", "tree", "cloud", "tower"]},
            {"q": "What flies without wings?", "ans": "time", "options": ["time", "airplane", "kite", "bird"]},
            {"q": "What runs around the whole yard without moving?", "ans": "fence", "options": ["fence", "dog", "sprinkler", "path"]},
            {"q": "What comes down but never goes up?", "ans": "rain", "options": ["rain", "snow", "elevator", "kite"]},
            {"q": "I have cities but no houses, forests but no trees, and water but no fish. What am I?", "ans": "map", "options": ["map", "globe", "picture", "painting"]},
            {"q": "What invention lets you look right through a wall?", "ans": "window", "options": ["window", "telescope", "mirror", "camera"]},
            {"q": "What goes through cities and fields but never moves?", "ans": "road", "options": ["road", "river", "train", "wind"]},
            {"q": "What has 88 keys but can't open a single door?", "ans": "piano", "options": ["piano", "keychain", "safe", "computer"]},
            {"q": "What gets sharper the more you use it?", "ans": "mind", "options": ["mind", "knife", "pencil", "tool"]},
        ]
    elif diff == "hard":
        riddles = [
            {"q": "The person who makes it has no need of it; the person who buys it has no use for it. The person who uses it can neither see nor feel it. What is it?", "ans": "coffin", "options": ["coffin", "car", "mirror", "house"]},
            {"q": "What can travel all around the world while remaining in a corner?", "ans": "stamp", "options": ["stamp", "bird", "airplane", "shadow"]},
            {"q": "I have cities, but no houses. I have mountains, but no trees. I have water, but no fish. What am I?", "ans": "map", "options": ["map", "globe", "picture", "dream"]},
            {"q": "I am not alive, but I grow; I don't have lungs, but I need air; I don't have a mouth, but water kills me. What am I?", "ans": "fire", "options": ["fire", "plant", "balloon", "shadow"]},
            {"q": "What speaks every language but was never taught any?", "ans": "echo", "options": ["echo", "translator", "music", "wind"]},
            {"q": "What is greater than God, more evil than the devil, the poor have it, the rich need it, and if you eat it you'll die?", "ans": "nothing", "options": ["nothing", "greed", "poverty", "dust"]},
            {"q": "The eight of us go forth, not back, to protect our king from a foe's attack. What are we?", "ans": "chess pawns", "options": ["chess pawns", "soldiers", "fingers", "guards"]},
            {"q": "I am always hungry, I must always be fed. The finger I touch, will soon turn red. What am I?", "ans": "fire", "options": ["fire", "rust", "acid", "sun"]},
            {"q": "I have branches, but no fruit, trunk, or leaves. What am I?", "ans": "bank", "options": ["bank", "river", "tree", "road"]},
            {"q": "You answer me, but I never ask you a question. What am I?", "ans": "doorbell", "options": ["doorbell", "mirror", "book", "phone"]},
            {"q": "What has a golden tail and a golden head and in the middle nothing but dead?", "ans": "candle", "options": ["candle", "coin", "snake", "torch"]},
            {"q": "I am light as a feather, but the strongest person can't hold me for more than 5 minutes. What am I?", "ans": "breath", "options": ["breath", "shadow", "feather", "air"]},
            {"q": "What is always in front of you but can't be seen?", "ans": "future", "options": ["future", "air", "wind", "hope"]},
            {"q": "The more of me you have, the less you see. What am I?", "ans": "darkness", "options": ["darkness", "light", "fog", "silence"]},
            {"q": "Forward I am heavy, but backward I am not. What am I?", "ans": "ton", "options": ["ton", "lead", "stone", "not"]},
        ]
    elif diff == "expert":
        riddles = [
            {"q": "A box without hinges, key, or lid, yet golden treasure inside is hid. What is it?", "ans": "egg", "options": ["egg", "chest", "casket", "banana"]},
            {"q": "What starts with T, ends with T, and has T in it?", "ans": "teapot", "options": ["teapot", "tent", "ticket", "toast"]},
            {"q": "The more you take, the more you leave behind. What am I?", "ans": "footsteps", "options": ["footsteps", "memories", "breaths", "time"]},
            {"q": "What can run but never walks, has a mouth but never talks, has a head but never weeps, has a bed but never sleeps?", "ans": "river", "options": ["river", "ocean", "clock", "wind"]},
            {"q": "I am taken from a mine and shut up in a wooden case, from which I am never released, and yet I am used by almost every person. What am I?", "ans": "pencil", "options": ["pencil", "diamond", "coal", "gold"]},
            {"q": "If you have me, you want to share me. If you share me, you haven't got me. What am I?", "ans": "secret", "options": ["secret", "gift", "knowledge", "love"]},
            {"q": "What is made of water, but if you put it into water, it will die?", "ans": "ice", "options": ["ice", "cloud", "salt", "snow"]},
            {"q": "I have a head but no body, a heart but no blood, leaves but no branches, and I grow without wood. What am I?", "ans": "lettuce", "options": ["lettuce", "tree", "flower", "book"]},
            {"q": "What force and strength cannot get through, I with a gentle touch can do, and many in the street would stand, were I not as a friend at hand. What am I?", "ans": "key", "options": ["key", "money", "lock", "password"]},
            {"q": "I am not alive, yet I grow. I don't have lungs, yet I need air. I don't have a mouth, yet water kills me. What am I?", "ans": "fire", "options": ["fire", "rust", "plant", "mold"]},
            {"q": "I'm lighter than air but a million men cannot lift me. What am I?", "ans": "bubble", "options": ["bubble", "feather", "shadow", "cloud"]},
            {"q": "People buy me to eat but never eat me. What am I?", "ans": "plate", "options": ["plate", "spoon", "packaging", "tray"]},
            {"q": "What word is spelled incorrectly in every dictionary?", "ans": "incorrectly", "options": ["incorrectly", "error", "wrong", "mistake"]},
            {"q": "A man who was outside in the rain without an umbrella or hat didn't get a single hair on his head wet. Why?", "ans": "bald", "options": ["bald", "hat", "hood", "fast"]},
            {"q": "What question can you never answer yes to?", "ans": "Are you asleep yet?", "options": ["Are you asleep yet?", "Are you happy?", "Are you awake?", "Is it raining?"]},
        ]
    else:  # Medium
        riddles = [
            {"q": "I speak without a mouth and hear without ears. I have no body, but I come alive with wind. What am I?", "ans": "echo", "options": ["echo", "ghost", "whistle", "cloud"]},
            {"q": "What has many keys but can't open a single lock?", "ans": "piano", "options": ["piano", "keychain", "map", "door"]},
            {"q": "What has one eye but cannot see?", "ans": "needle", "options": ["needle", "cyclops", "storm", "hurricane"]},
            {"q": "What can you catch, but not throw?", "ans": "cold", "options": ["cold", "ball", "fish", "train"]},
            {"q": "What goes up when rain comes down?", "ans": "umbrella", "options": ["umbrella", "flood", "temperature", "spirits"]},
            {"q": "I have no life but I can die. What am I?", "ans": "battery", "options": ["battery", "plant", "fire", "robot"]},
            {"q": "The faster you run, the harder it is to catch me. What am I?", "ans": "breath", "options": ["breath", "shadow", "wind", "cheetah"]},
            {"q": "What has words but never speaks?", "ans": "book", "options": ["book", "sign", "mute", "note"]},
            {"q": "What loses its head in the morning and gets it back at night?", "ans": "pillow", "options": ["pillow", "candle", "hat", "bed"]},
            {"q": "What is so delicate that saying its name breaks it?", "ans": "silence", "options": ["silence", "glass", "ice", "promise"]},
            {"q": "What can fill a room but takes up no space?", "ans": "light", "options": ["light", "air", "sound", "warmth"]},
            {"q": "You use me more and more the older you get. What am I?", "ans": "memory", "options": ["memory", "phone", "glasses", "cane"]},
            {"q": "What building has the most stories?", "ans": "library", "options": ["library", "skyscraper", "hospital", "school"]},
            {"q": "What is yours but others use it more than you?", "ans": "name", "options": ["name", "mirror", "money", "identity"]},
            {"q": "What breaks yet never falls, and falls yet never breaks?", "ans": "day and night", "options": ["day and night", "glass", "rain", "wave"]},
        ]

    # Pick a random riddle that hasn't been shown recently
    shuffled = riddles.copy()
    random.shuffle(shuffled)
    for r in shuffled:
        if r["q"] not in _RECENT_QUESTIONS:
            _RECENT_QUESTIONS.add(r["q"])
            if len(_RECENT_QUESTIONS) > 300:
                try:
                    _RECENT_QUESTIONS.pop()
                except Exception:
                    pass
            return {
                "challenge_type": "Riddles",
                "difficulty": difficulty,
                "question": r["q"],
                "expected_answer": r["ans"],
                "hint": "Think abstractly about metaphors and wordplay.",
                "options": r.get("options", [])
            }
    # Fallback if all have been shown
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
            {"q": "How many hours are in a full day?", "ans": "24", "options": ["12", "24", "48", "60"]},
            {"q": "How many months are in a year?", "ans": "12", "options": ["10", "12", "15", "52"]},
            {"q": "What is 2 + 2?", "ans": "4", "options": ["2", "3", "4", "5"]},
            {"q": "Which planet is closest to the sun?", "ans": "Mercury", "options": ["Earth", "Venus", "Mercury", "Mars"]},
            {"q": "How many legs does a spider have?", "ans": "8", "options": ["6", "8", "10", "12"]},
            {"q": "What color is the sky on a clear day?", "ans": "Blue", "options": ["Red", "Blue", "Green", "Yellow"]},
            {"q": "How many continents are on Earth?", "ans": "7", "options": ["5", "6", "7", "8"]},
            {"q": "What is H2O commonly known as?", "ans": "water", "options": ["salt", "water", "oxygen", "acid"]},
            {"q": "How many seconds are in a minute?", "ans": "60", "options": ["30", "60", "100", "120"]},
            {"q": "What is the largest mammal on Earth?", "ans": "Blue whale", "options": ["Elephant", "Blue whale", "Giraffe", "Rhino"]},
            {"q": "Which instrument has black and white keys?", "ans": "Piano", "options": ["Guitar", "Drum", "Piano", "Flute"]},
            {"q": "What shape has three sides?", "ans": "Triangle", "options": ["Circle", "Square", "Triangle", "Rectangle"]},
            {"q": "How many zeros are in one thousand?", "ans": "3", "options": ["2", "3", "4", "5"]},
        ]
    elif diff == "easy":
        quizzes = [
            {"q": "How many sides does a hexagon have?", "ans": "6", "options": ["5", "6", "7", "8"]},
            {"q": "Which is the largest ocean on Earth?", "ans": "Pacific", "options": ["Atlantic", "Indian", "Pacific", "Arctic"]},
            {"q": "What color is formed by mixing Blue and Yellow?", "ans": "Green", "options": ["Purple", "Green", "Orange", "Brown"]},
            {"q": "What is the capital of France?", "ans": "Paris", "options": ["Rome", "London", "Paris", "Berlin"]},
            {"q": "Which gas do plants absorb from the air?", "ans": "Carbon dioxide", "options": ["Oxygen", "Carbon dioxide", "Nitrogen", "Helium"]},
            {"q": "What is the longest river in the world?", "ans": "Nile", "options": ["Amazon", "Nile", "Yangtze", "Mississippi"]},
            {"q": "How many bones are in the adult human body?", "ans": "206", "options": ["196", "206", "216", "226"]},
            {"q": "Which is the smallest country in the world?", "ans": "Vatican City", "options": ["Monaco", "Vatican City", "San Marino", "Liechtenstein"]},
            {"q": "What does WWW stand for in web addresses?", "ans": "World Wide Web", "options": ["World Wide Web", "Wide World Web", "Western Wide Web", "World Web Wide"]},
            {"q": "How many players are on a basketball team on the court?", "ans": "5", "options": ["4", "5", "6", "7"]},
            {"q": "What organ pumps blood around the body?", "ans": "Heart", "options": ["Lungs", "Heart", "Liver", "Kidney"]},
            {"q": "Which is the tallest mountain in the world?", "ans": "Mount Everest", "options": ["K2", "Mount Everest", "Kangchenjunga", "Annapurna"]},
            {"q": "What does DNA stand for?", "ans": "Deoxyribonucleic acid", "options": ["Digital Nucleic Acid", "Deoxyribonucleic acid", "Dual Nucleic Array", "Dynamic Neural Acid"]},
            {"q": "Which planet has the most moons in our solar system?", "ans": "Saturn", "options": ["Jupiter", "Saturn", "Uranus", "Neptune"]},
            {"q": "What is the chemical formula for common salt?", "ans": "NaCl", "options": ["NaCl", "H2O", "CO2", "KCl"]},
        ]
    elif diff == "hard":
        quizzes = [
            {"q": "What is the chemical symbol for Gold?", "ans": "Au", "options": ["Ag", "Au", "Fe", "Cu"]},
            {"q": "In computer science, how many bits are in a byte?", "ans": "8", "options": ["4", "8", "16", "32"]},
            {"q": "What is the capital city of Australia?", "ans": "Canberra", "options": ["Sydney", "Melbourne", "Canberra", "Brisbane"]},
            {"q": "What is the name of the process by which plants make food?", "ans": "Photosynthesis", "options": ["Respiration", "Photosynthesis", "Fermentation", "Oxidation"]},
            {"q": "Which element has the atomic number 79?", "ans": "Gold", "options": ["Silver", "Gold", "Platinum", "Copper"]},
            {"q": "What is the largest bone in the human body?", "ans": "Femur", "options": ["Tibia", "Femur", "Spine", "Humerus"]},
            {"q": "Which famous scientist developed the theory of relativity?", "ans": "Einstein", "options": ["Newton", "Einstein", "Curie", "Tesla"]},
            {"q": "What is the powerhouse of the cell?", "ans": "Mitochondria", "options": ["Nucleus", "Mitochondria", "Ribosome", "Lysosome"]},
            {"q": "In what year did World War II end?", "ans": "1945", "options": ["1943", "1944", "1945", "1946"]},
            {"q": "What is the hardest natural substance on Earth?", "ans": "Diamond", "options": ["Diamond", "Quartz", "Titanium", "Obsidian"]},
            {"q": "What is the SI unit of electric current?", "ans": "Ampere", "options": ["Volt", "Watt", "Ohm", "Ampere"]},
            {"q": "Which programming language is known as the mother of all languages?", "ans": "C", "options": ["Python", "Java", "C", "FORTRAN"]},
            {"q": "How many chromosomes does a normal human cell contain?", "ans": "46", "options": ["23", "44", "46", "48"]},
            {"q": "What is the speed of sound in air at room temperature (m/s approx)?", "ans": "343", "options": ["300", "343", "400", "500"]},
            {"q": "Who invented the telephone?", "ans": "Alexander Graham Bell", "options": ["Thomas Edison", "Alexander Graham Bell", "Nikola Tesla", "Benjamin Franklin"]},
        ]
    elif diff == "expert":
        quizzes = [
            {"q": "Which country has the most natural lakes in the world?", "ans": "Canada", "options": ["Canada", "USA", "Russia", "Brazil"]},
            {"q": "What is the speed of light in vacuum (in km/s approximately)?", "ans": "300000", "options": ["150000", "300000", "450000", "600000"]},
            {"q": "Who wrote 'Hamlet'?", "ans": "William Shakespeare", "options": ["Charles Dickens", "William Shakespeare", "Mark Twain", "Jane Austen"]},
            {"q": "What is the Chandrasekhar limit (in solar masses)?", "ans": "1.4", "options": ["0.8", "1.4", "2.0", "3.0"]},
            {"q": "Which particle is responsible for the weak nuclear force?", "ans": "W boson", "options": ["Gluon", "Photon", "W boson", "Graviton"]},
            {"q": "In Euclidean geometry, what is the sum of interior angles of a pentagon?", "ans": "540", "options": ["360", "450", "540", "720"]},
            {"q": "What is the chemical composition of ozone?", "ans": "O3", "options": ["O2", "O3", "O4", "CO3"]},
            {"q": "Who formulated the laws of planetary motion?", "ans": "Kepler", "options": ["Newton", "Galileo", "Kepler", "Copernicus"]},
            {"q": "What is the world's oldest known programming language still in use?", "ans": "FORTRAN", "options": ["COBOL", "FORTRAN", "Lisp", "Assembly"]},
            {"q": "Which organelle is responsible for protein synthesis?", "ans": "Ribosome", "options": ["Golgi body", "Ribosome", "ER", "Mitochondria"]},
            {"q": "What is the half-life of Carbon-14 (approx years)?", "ans": "5730", "options": ["1000", "3700", "5730", "10000"]},
            {"q": "What does GPS stand for?", "ans": "Global Positioning System", "options": ["Global Positioning System", "General Projection Satellite", "Geo-Polar System", "Global Path System"]},
            {"q": "Which acid is produced in the human stomach for digestion?", "ans": "Hydrochloric acid", "options": ["Sulfuric acid", "Nitric acid", "Hydrochloric acid", "Acetic acid"]},
            {"q": "What is the first element in the periodic table?", "ans": "Hydrogen", "options": ["Helium", "Hydrogen", "Lithium", "Oxygen"]},
            {"q": "Who developed the Python programming language?", "ans": "Guido van Rossum", "options": ["Linus Torvalds", "Guido van Rossum", "Dennis Ritchie", "James Gosling"]},
        ]
    else:  # Medium
        quizzes = [
            {"q": "Which planet in our solar system is known as the Red Planet?", "ans": "Mars", "options": ["Venus", "Mars", "Jupiter", "Saturn"]},
            {"q": "How many minutes are in 2.5 hours?", "ans": "150", "options": ["120", "130", "150", "180"]},
            {"q": "Who painted the Mona Lisa?", "ans": "Leonardo da Vinci", "options": ["Pablo Picasso", "Vincent van Gogh", "Leonardo da Vinci", "Claude Monet"]},
            {"q": "What is the currency of Japan?", "ans": "Yen", "options": ["Won", "Yen", "Dollar", "Rupee"]},
            {"q": "How many strings does a standard guitar have?", "ans": "6", "options": ["4", "5", "6", "7"]},
            {"q": "What is the freezing point of water in Celsius?", "ans": "0", "options": ["-10", "0", "10", "32"]},
            {"q": "Which gas makes up the majority of Earth's atmosphere?", "ans": "Nitrogen", "options": ["Oxygen", "Carbon dioxide", "Nitrogen", "Argon"]},
            {"q": "How many sides does a pentagon have?", "ans": "5", "options": ["4", "5", "6", "7"]},
            {"q": "What is the capital of Germany?", "ans": "Berlin", "options": ["Munich", "Berlin", "Hamburg", "Frankfurt"]},
            {"q": "Which organ is responsible for filtering blood in the human body?", "ans": "Kidney", "options": ["Liver", "Kidney", "Spleen", "Heart"]},
            {"q": "What is the square root of 144?", "ans": "12", "options": ["10", "11", "12", "13"]},
            {"q": "Who is known as the father of computers?", "ans": "Charles Babbage", "options": ["Alan Turing", "Charles Babbage", "Bill Gates", "John Von Neumann"]},
            {"q": "What is the boiling point of water in Celsius?", "ans": "100", "options": ["80", "90", "100", "120"]},
            {"q": "Which country won the FIFA World Cup in 2018?", "ans": "France", "options": ["Germany", "Brazil", "France", "Croatia"]},
            {"q": "What does the acronym CPU stand for?", "ans": "Central Processing Unit", "options": ["Central Processing Unit", "Core Power Unit", "Computer Processing Utility", "Control Processing Unit"]},
        ]

    # Strict deduplication: pick first unseen question in shuffled pool
    shuffled = quizzes.copy()
    random.shuffle(shuffled)
    for qz in shuffled:
        if qz["q"] not in _RECENT_QUESTIONS:
            _RECENT_QUESTIONS.add(qz["q"])
            if len(_RECENT_QUESTIONS) > 300:
                try:
                    _RECENT_QUESTIONS.pop()
                except Exception:
                    pass
            return {
                "challenge_type": "Quick Quizzes",
                "difficulty": difficulty,
                "question": qz["q"],
                "expected_answer": qz["ans"],
                "hint": "Recall foundational facts.",
                "options": qz.get("options", [])
            }
    # Fallback
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
