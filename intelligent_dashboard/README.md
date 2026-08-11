# AI Intelligent Cognitive Alarm Platform

An intelligent alarm platform built with FastAPI. It features smart alarm scheduling, cognitive wake-up puzzles powered by Google Gemini AI, adaptive difficulty selection based on user accuracy and speed, and real-time circadian tracking.

## Quick Start

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Run the application
python app.py
```

Access dashboard at: **http://127.0.0.1:8000**  
Interactive API docs at: **http://127.0.0.1:8000/docs**

---

## Key Features

- **7 Cognitive Challenge Types**: Math Problems, Logic Puzzles, Memory Challenges, Word Games, Pattern Recognition, Riddles, and Quick Quizzes.
- **5 Difficulty Levels**: Beginner, Easy, Medium, Hard, and Expert.
- **Personalized & Adaptive Selection**: Automatically scales challenge difficulty up or down based on your previous accuracy, completion time, and failed attempts.
- **Gemini LLM Integration**: Generates fresh challenges using Google Gemini 1.5/3.5 Flash AI, with an automatic fallback rule engine when offline.
- **Real-Time Analytics**: Tracks streak days, habit scores (0–100), completion accuracy, and time taken in real-time without dummy data.
- **Snooze & Disarm Rules**: Alarms ring continuously until solved or snoozed. One-time alarms disarm automatically upon completion.

---

## Demo Accounts

| Role | Email / Username | Password |
|---|---|---|
| **User** | `user` | `user123` |
| **Coach** | `coach` | `coach123` |
| **Admin** | `admin` | `admin123` |

---

## Project Structure

```text
intelligent_dashboard/
├── app.py                 # FastAPI application entry point
├── database.py            # Database models (User, Alarm, ChallengePerformance, etc.)
├── challenge_generator.py # Gemini LLM & rule engine challenge generators
├── alarm_scheduler.py     # Background APScheduler service
├── config.py              # App configuration & API key settings
├── routes/                # Endpoint routers (auth, user, alarm, admin, coach)
├── templates/             # HTML Jinja2 dashboards
├── static/                # CSS and static assets
├── test_alarms.py         # Pytest test suite (25 tests)
└── requirements.txt       # Project dependencies
```
