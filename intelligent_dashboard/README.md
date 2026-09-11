# Intelligent Cognitive Alarm Platform

An AI-powered Intelligent Cognitive Alarm Platform that helps users develop consistent wake-up habits by requiring them to solve personalized puzzles, riddles, memory challenges, logic problems, or math exercises before dismissing alarms.

The platform adapts challenge difficulty based on user behavior, wake-up performance, snooze patterns, sleep schedules, and cognitive engagement levels to improve productivity, reduce oversleeping, and encourage healthy circadian routines.

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Run the Platform
```bash
python app.py
```
- **Dashboard UI**: [http://127.0.0.1:8080](http://127.0.0.1:8080) (or port 5000)
- **Interactive OpenAPI Documentation**: [http://127.0.0.1:8080/docs](http://127.0.0.1:8080/docs)

### 3. Demo Credentials

| Role | Username / Email | Password | Dashboard Features |
|---|---|---|---|
| **User** | `user` | `user123` | Alarm Centre, 7 Cognitive Puzzles, Habit Scoring, Coach Appointment Scheduling |
| **Coach** | `coach` | `coach123` | Client Dossiers, Sleep Telemetry, Motivation Notes, Appointment Scheduling & Management |
| **Administrator** | `admin` | `admin123` | User Management, DAU Telemetry, Platform Announcements, System Logs |

---

## 🏛️ System Architecture

Refer to [ARCHITECTURE.md](file:///c:/Users/Rachana/OneDrive/Desktop/internship/intelligent_dashboard/ARCHITECTURE.md) for the complete 4-tier architectural specification and Mermaid sequence diagrams.

```text
┌─────────────────────────────────────────────────────────────┐
│ 1. Presentation Tier (HTML5, Tailwind CSS, Jinja2, Web Audio)│
├─────────────────────────────────────────────────────────────┤
│ 2. API & Application Tier (FastAPI, APScheduler, JWT Auth)  │
├─────────────────────────────────────────────────────────────┤
│ 3. Cognitive & AI Engine (Gemini LLM, 7 Rule Generators, ML)│
├─────────────────────────────────────────────────────────────┤
│ 4. Data & Persistence Layer (PostgreSQL / SQLite, Files)    │
└─────────────────────────────────────────────────────────────┘
```

---

## 📦 13 Modules Implemented

1. **User Authentication & Role-Based Access Control**:
   - Secure registration, Bcrypt password hashing, JWT access & refresh tokens, RBAC (`user`, `coach`, `administrator`).
2. **User Profile & Habit Management**:
   - Wake-up and bedtime scheduling, circadian time zone normalization, productivity goal tracking, challenge preferences.
3. **Alarm Scheduling System**:
   - Daily, Weekday, Weekend, One-Time, and Smart Adaptive alarms with auto-disarm and APScheduler integration.
4. **Cognitive Challenge Engine**:
   - 7 Challenge Types: Math Problems, Logic Puzzles, Memory Challenges, Word Games, Pattern Recognition, Riddles, Quick Quizzes.
   - Dual-engine: Google Gemini Flash AI + 100% offline deterministic rule generators.
5. **Adaptive Difficulty Engine**:
   - 5 Difficulty Levels (Beginner, Easy, Medium, Hard, Expert) auto-adapting via a moving-window accuracy and speed model.
6. **Wake-Up Verification Module**:
   - 5 Verification Methods: Puzzle Completion, Multi-Step Challenges (minimum 5 questions), Consecutive Streak, Time-Based Blitz, and Cognitive Accuracy Checks.
   - Anti-snooze enforcement (hard-locked snooze until questions solved).
   - Post-wake confirmation ("Are you awake?" 3-tier alertness check).
7. **Behavioral Analytics Engine**:
   - Real-time telemetry tracking snooze frequency, wake drift, sleep debt, weekly habit compliance, and productivity correlation.
8. **Habit Scoring Engine**:
   - Neuro-behavioral formula:
     $$\text{Habit Score} = 0.35 \times \text{Wake Consistency} + 0.25 \times \text{Challenge Success} + 0.20 \times \text{Snooze Reduction} + 0.20 \times \text{Sleep Adherence}$$
9. **Recommendation Engine**:
   - Multi-pillar circadian optimization suggestions across sleep quality, wake habits, and cognitive focus.
10. **Multi-Role Dashboards & Analytics**:
    - **User Dashboard**: Habit scoring, live alarm disarm simulation, appointment booking modal with coach.
    - **Coach Dashboard**: Client monitoring, circadian dossiers, appointment confirmation and scheduling hub.
    - **Admin Dashboard**: Real DAU trends, registration growth curves, announcements, activity logs.
11. **Notification & Reminder System**:
    - In-app notification hub, bedtime and wake reminders, habit alerts, FCM device token endpoints.
12. **Reports & Export System**:
    - Clinical-grade PDF export (ReportLab), multi-sheet Excel export (OpenPyXL / Pandas), and CSV raw data exports.
13. **Testing, Verification & Zero-Error Architecture**:
    - 74 automated unit and integration tests passing with 100% success rate.
    - Client-side and server-side fallbacks guaranteeing zero question display or runtime errors.

---

## 🧪 Test Suite Execution

Run all 74 unit, integration, and regression tests:

```bash
pytest test_alarms.py test_challenges.py test_module5.py test_modules_7_to_12.py
```

Result:
```text
======================= 74 passed, 1 warning in 19.62s ========================
```
