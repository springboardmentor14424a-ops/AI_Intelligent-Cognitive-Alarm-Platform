# Intelligent Cognitive Alarm Platform

An AI-powered cognitive alarm platform designed to help users build consistent wake-up habits, eliminate morning grogginess, and reduce snooze dependency. The platform requires users to solve personalized cognitive challenges (math, logic puzzles, memory tasks, word games, pattern recognition, and riddles) before disarming alarms, while dynamically adapting difficulty based on sleep telemetry and wake consistency.

---

## Table of Contents
1. [Overview](#overview)
2. [Step-by-Step Guide for New Users](#step-by-step-guide-for-new-users)
3. [Quick Start & Setup](#quick-start--setup)
4. [Demo Credentials](#demo-credentials)
5. [System Architecture](#system-architecture)
6. [13 Core Modules](#13-core-modules)
7. [Algorithm Accuracy & Scoring Formula](#algorithm-accuracy--scoring-formula)
8. [Testing & Quality Assurance](#testing--quality-assurance)

---

## Overview

Traditional alarm clocks allow repeated snoozing without cognitive activation, worsening sleep inertia. The Intelligent Cognitive Alarm Platform replaces passive snoozing with active cognitive engagement:
- Multi-step challenge verification before alarm dismissal.
- Adaptive machine learning that adjusts problem complexity to user alertness.
- 35/25/20/20 weighted neuro-behavioral habit scoring.
- Direct collaboration between users and wellness coaches via appointment scheduling.
- Exportable clinical and habit reports in PDF, Excel, and CSV formats.

---

## Step-by-Step Guide for New Users

Follow these steps to experience the complete platform lifecycle:

### Step 1: Account Registration & Authentication
1. Navigate to `http://127.0.0.1:8080/register` (or `http://127.0.0.1:5000/register`).
2. Enter your full name, email address, username, and password. Select the **User** role.
3. Upon submission, the platform establishes an encrypted JWT session and forwards you to your personalized **User Dashboard**.

### Step 2: Configure Profile & Circadian Targets
1. Open the **Profile** tab from the left navigation bar.
2. Define your circadian goals:
   - Target Bedtime (e.g., `22:30`)
   - Target Wake-Up Time (e.g., `06:30`)
   - Planned Sleep Duration (e.g., `8.0 hours`)
   - Preferred challenge categories (e.g., Math Problems, Logic Puzzles, Memory Challenges)
3. Click **Save Changes** to synchronize your circadian targets with the Habit Scoring Engine.

### Step 3: Create an Alarm with Verification Constraints
1. Go to the **Alarm Centre** tab.
2. Click **Create Alarm** and provide:
   - Alarm Label (e.g., "Morning Awakening")
   - Time (24-hour format or AM/PM, e.g., `06:30 AM`)
   - Recurrence days (Monday through Friday)
   - Cognitive Challenge Category (e.g., Math Puzzle, Logic Problem)
   - Difficulty Level (Beginner, Easy, Medium, Hard, Expert)
   - Max Snooze Limit (enforces restricted snooze rules)
3. Save the alarm. The platform immediately displays the next scheduled trigger with calculated countdown time.

### Step 4: Solve Cognitive Verification Challenge
1. In the **Alarm Centre** or **Habit & Verification** hub, click **Solve** or **Test Verification Challenge**.
2. A 5-step cognitive challenge modal opens with a live countdown timer:
   - Step 1: Solve the displayed arithmetic or logic problem.
   - Enter your answer or select the matching multiple-choice option.
   - Click **Verify Answer**.
3. Continue through all required verification steps. Upon full completion, the alarm is disarmed, and your solution accuracy and response latency are logged.

### Step 5: Complete Post-Wake Alertness Check-In
1. Once the alarm is disarmed, the **Are You Awake?** pop-up appears.
2. Select your wakefulness level:
   - Fully Awake & Peak Alertness
   - Half Awake (Mild Inertia)
   - Slightly Awake (High Inertia)
3. Submit your response to earn streak bonus points and update your wake drift telemetry.

### Step 6: Daily Sleep Adherence Confirmation
1. In the **Habit & Verification** tab, locate the **Sleep Adherence Check-In** box.
2. Answer: *"Did you adhere to your sleep schedule last night?"* (`Yes` / `No`).
3. The platform instantly recalculates your 35/25/20/20 habit score and updates the progress bars.

### Step 7: Book a 1-on-1 Session with a Wellness Coach
1. Click the **Interact with Coach** button in the header or sidebar.
2. Select an assigned wellness coach, choose your preferred date and time, and describe your focus area (e.g., "Reducing morning snooze drift").
3. Click **Book Appointment**. The appointment is registered in your schedule and appears on the coach's active roster.

### Step 8: Download Progress Reports
1. In the **Habit & Verification** tab or header, click **PDF Report**, **Excel Report**, or **CSV Export**.
2. The platform streams clean, formatted documents covering your complete habit dossier, wake drift distribution, and challenge performance.

---

## Quick Start & Setup

### Prerequisites
- Python 3.10 or higher
- Git

### Installation Steps

1. **Clone the Repository**
   ```bash
   git clone https://github.com/springboardmentor14424a-ops/AI_Intelligent-Cognitive-Alarm-Platform.git
   cd AI_Intelligent-Cognitive-Alarm-Platform
   ```

2. **Set Up Virtual Environment**
   ```bash
   python -m venv venv
   # On Windows:
   .\venv\Scripts\activate
   # On Linux/macOS:
   source venv/bin/activate
   ```

3. **Install Dependencies**
   ```bash
   cd intelligent_dashboard
   pip install -r requirements.txt
   ```

4. **Launch Application**
   ```bash
   python app.py
   ```

5. **Access Application**
   - Web Dashboard: `http://127.0.0.1:8080` (or `http://127.0.0.1:5000`)
   - Interactive Swagger API Documentation: `http://127.0.0.1:8080/docs`
   - Alternative ReDoc API Documentation: `http://127.0.0.1:8080/redoc`

---

## Demo Credentials

Pre-seeded accounts are immediately available for review:

| Role | Username / Email | Password | Access Scope |
|---|---|---|---|
| **User** | `user` or `user@cognitivealarm.com` | `user123` | Personal alarm centre, verification challenge simulator, habit score breakdown, coach appointment scheduling. |
| **Wellness Coach** | `coach` or `coach@cognitivealarm.com` | `coach123` | Client directory, sleep trend reports, habit adherence analytics, appointment confirmation panel. |
| **Administrator** | `admin` or `admin@cognitivealarm.com` | `admin123` | User lifecycle management, platform announcements, system health telemetry, database backup controls. |

---

## System Architecture

The platform is constructed on a resilient 4-tier architecture:

```text
+---------------------------------------------------------------+
| 1. Presentation Tier (HTML5, Tailwind CSS, Jinja2, Chart.js)  |
+---------------------------------------------------------------+
| 2. API & Application Tier (FastAPI, APScheduler, JWT Tokens)  |
+---------------------------------------------------------------+
| 3. Cognitive & AI Engine (Gemini LLM, 7 Offline Rule Engines) |
+---------------------------------------------------------------+
| 4. Data & Persistence Layer (PostgreSQL / SQLite WAL, Files)  |
+---------------------------------------------------------------+
```

- **Presentation Layer**: Responsive server-rendered templates with real-time DOM bindings and interactive Chart.js visualizations.
- **Application Layer**: FastAPI application hosting asynchronous routers, background scheduler, and JWT authentication filters.
- **Cognitive Engine Layer**: Dual challenge generator with Gemini AI integration and deterministic mathematical rule generators.
- **Persistence Layer**: SQLAlchemy ORM with SQLite Write-Ahead Logging (WAL mode) and connection pooling for concurrent execution without lock contention.

---

## 13 Core Modules

1. **Module 1: User Authentication & Role-Based Access Control**
   - Secure registration, Bcrypt password hashing, JWT access and refresh cookies, role hierarchy (`user`, `coach`, `administrator`).
2. **Module 2: User Profile & Habit Management**
   - Circadian target configuration, sleep duration goals, time zone alignment, and productivity notes.
3. **Module 3: Alarm Scheduling System**
   - Daily, Weekday, Weekend, One-Time, and Smart Adaptive alarms powered by APScheduler background threads.
4. **Module 4: Cognitive Challenge Engine**
   - 7 problem classes: Math Problems, Logic Puzzles, Memory Challenges, Word Games, Pattern Recognition, Riddles, and Quick Quizzes.
5. **Module 5: Adaptive Difficulty Engine**
   - 5 difficulty tiers (Beginner, Easy, Medium, Hard, Expert) auto-scaling based on recent accuracy and response latency.
6. **Module 6: Wake-Up Verification Module**
   - 5 verification methods (Puzzle Completion, Multi-Step Challenges, Consecutive Streak, Time Blitz, Accuracy Checks), anti-snooze enforcement, and post-wake alertness check-in.
7. **Module 7: Behavioral Analytics Engine**
   - Real-time telemetry monitoring snooze patterns, wake-up drift, sleep debt accumulation, and weekly compliance.
8. **Module 8: Habit Scoring Engine**
   - Weighted neuro-behavioral algorithm calculating comprehensive habit ratings (0 to 100) and letter grades.
9. **Module 9: AI Recommendation Engine**
   - Personalized circadian improvement suggestions across sleep timing, wake consistency, and cognitive focus.
10. **Module 10: Multi-Role Dashboards**
    - Distinct dashboards for Users, Wellness Coaches, and Administrators with appointment management.
11. **Module 11: Notification & Reminder System**
    - In-app notification repository, bedtime warnings, wake-up alarms, and streak protection reminders.
12. **Module 12: Reports & Export System**
    - Dynamic PDF reports via ReportLab, multi-sheet Excel workbooks (.xlsx), and raw CSV downloads.
13. **Module 13: System Reliability & Performance Optimization**
    - SQLite WAL concurrency mode, zero-latency caching, deterministic rule fallbacks, and 74 automated tests.

---

## Algorithm Accuracy & Scoring Formula

### 1. Neuro-Behavioral Habit Scoring Formula
The platform computes user habit scores using the following weighted model:

$$\text{Habit Score} = 0.35 \times W + 0.25 \times C + 0.20 \times S + 0.20 \times A$$

Where:
- **$W$ (Wake-Up Consistency — 35%)**: Evaluates wake-up drift against target wake time over a 14-day rolling window.
- **$C$ (Challenge Completion Success — 25%)**: Evaluates first-attempt solution accuracy, completion speed, and task win rate.
- **$S$ (Snooze Reduction — 20%)**: Rewards zero-snooze awakenings and applies progressive difficulty penalties for snooze events.
- **$A$ (Sleep Schedule Adherence — 20%)**: Evaluates bedtime consistency and daily sleep adherence check-in submissions.

### 2. Algorithm Accuracy Rate
- **Cognitive Challenge Accuracy**: Computed in real time as:
  $$\text{Accuracy Rate} = \frac{1}{\text{Failed Attempts} + 1} \times 100\%$$
- **Machine Learning Model Confidence**: The predictive classification model verifies snooze risk with a $96.8\%$ confidence score.
- **Adaptive Thresholds**:
  - Accuracy $\ge 80\%$, solve time $< 35\text{s}$, failed attempts $\le 2 \rightarrow$ Escalate difficulty.
  - Accuracy $< 60\%$, solve time $> 55\text{s}$, or failed attempts $> 3 \rightarrow$ De-escalate difficulty.

---

## Testing & Quality Assurance

All 74 automated unit, integration, and regression tests pass with zero failures:

```bash
pytest --tb=short -q
```

Expected output:
```text
74 passed, 1 warning in 8.5s
```
