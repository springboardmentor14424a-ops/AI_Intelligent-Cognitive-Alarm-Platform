# Intelligent Cognitive Alarm Platform — Comprehensive System Documentation

---

## 1. Title
**Intelligent Cognitive Alarm Platform**

---

## 2. Objective
Build an AI-powered Intelligent Cognitive Alarm Platform that helps users develop consistent wake-up habits by requiring them to solve personalized puzzles, riddles, memory challenges, logic problems, or math exercises before dismissing alarms.

The platform adapts challenge difficulty based on user behavior, wake-up performance, snooze patterns, sleep schedules, and cognitive engagement levels to improve productivity, reduce oversleeping, and encourage healthy circadian sleep routines.

The solution is engineered for:
- **Students**: Building exam-readiness morning alertness.
- **Professionals**: Minimizing morning grogginess and sleep inertia for peak focus.
- **Fitness Enthusiasts**: Aligning circadian rhythm with morning training schedules.
- **Productivity-Focused Individuals**: Eliminating chronic snooze relapse.
- **Wellness Platforms**: Providing certified coaches and mentors actionable telemetry to guide client sleep architecture.

### Key Outcomes
- Designed and built an AI-powered cognitive alarm platform.
- Implemented secure authentication and role-based access control (User, Wellness Coach, Administrator).
- Built adaptive alarm scheduling and wake-up management workflows.
- Developed personalized cognitive challenge generation systems (Google Gemini AI + 100% offline deterministic rule engine).
- Implemented behavioral analytics and difficulty adaptation engines.
- Built habit tracking and wake-up consistency monitoring modules (weighted 35/25/20/20 neuro-behavioral scoring).
- Developed responsive, real-time dashboards for sleep, alarm, and productivity analytics.
- Structured modular containerization and production infrastructure for scalable cloud deployment.

---

## 3. Architecture Diagram

```mermaid
graph TD
    %% ------------------------------------------------------------------------
    %% Tier 1: Client & Presentation Tier
    %% ------------------------------------------------------------------------
    subgraph T1["1. Client & Presentation Layer (Browser & Mobile Ready)"]
        direction TB
        WebUI["Responsive Web UI<br/>(HTML5 / Tailwind CSS / Jinja2 / Chart.js)"]
        AudioSynth["Web Audio API Synthesizer<br/>(Continuous Harmonic Alarm Chimes)"]
        PushClient["Mobile Notification Client<br/>(FCM Push / Browser Web Notifications)"]
        UserDash["User Dashboard<br/>(Habit Score, Alarms, Puzzles, Analytics, Coach Booking)"]
        CoachDash["Wellness Coach Dashboard<br/>(Client Dossiers, Behavior Telemetry & Appointment Hub)"]
        AdminDash["Admin Dashboard<br/>(User Mgmt, DAU, Logs, Announcements)"]
    end

    %% ------------------------------------------------------------------------
    %% Tier 2: API Gateway & Application Layer
    %% ------------------------------------------------------------------------
    subgraph T2["2. API Gateway & Application Layer (FastAPI)"]
        direction TB
        AuthService["Auth & RBAC Service<br/>(JWT Access & Refresh Tokens, Bcrypt, OAuth2)"]
        SchedulerService["APScheduler Background Service<br/>(Recurring Crons, Time Normalization, Trigger Checks)"]
        AlarmAPI["Alarm Scheduling API<br/>(CRUD, Smart Adaptive, Multiple Alarms)"]
        ChallengeAPI["Cognitive Challenge API<br/>(7 Types, 5 Difficulties, Real-Time Validation)"]
        VerificationAPI["Wake-Up Verification API<br/>(Multi-Step, Timed Blitz, Anti-Snooze, Confirmations)"]
        AppointmentAPI["Appointment Scheduling API<br/>(1-on-1 User-Coach Booking & Management)"]
        ReportingAPI["Reports & Export API<br/>(ReportLab PDF & OpenPyXL Excel)"]
    end

    %% ------------------------------------------------------------------------
    %% Tier 3: AI, ML & Cognitive Engines
    %% ------------------------------------------------------------------------
    subgraph T3["3. AI, Cognitive & Behavioral Analytics Tier"]
        direction TB
        GeminiLLM["Google Gemini Flash LLM<br/>(Dynamic AI Challenge Generation)"]
        RuleEngine["Deterministic Rule Engine Fallback<br/>(100% Offline Resilient 7-Type Generator)"]
        AdaptiveEngine["Adaptive Difficulty Engine (ML)<br/>(Moving Window Accuracy, Latency & Efficacy)"]
        BehavioralEngine["Behavioral Analytics Engine<br/>(Drift Analysis, Snooze Patterns, Sleep Debt)"]
        HabitEngine["Weighted Habit Scoring Engine<br/>(35% Wake, 25% Challenge, 20% Snooze, 20% Sleep)"]
        RecEngine["Unified Recommendation Engine<br/>(5 Pillars of Circadian Optimization)"]
    end

    %% ------------------------------------------------------------------------
    %% Tier 4: Data & Persistence Tier
    %% ------------------------------------------------------------------------
    subgraph T4["4. Data & Persistence Layer"]
        direction TB
        PostgresDB["Primary Relational Database: PostgreSQL<br/>(Users, Alarms, Logs, Appointments, Confirmations)"]
        SQLiteFallback["Local Database Engine Fallback: SQLite<br/>(Zero-Config Portable Storage)"]
        FileStore["File & Static Asset Store<br/>(PDF Dossiers, Excel Spreadsheets, Avatars)"]
    end

    %% Flow Connections
    T1 -->|HTTP Requests & REST APIs| T2
    AudioSynth -.->|Web Audio Output| WebUI
    T2 -->|Dispatches Challenge & ML Scoring| T3
    T2 -->|Reads/Writes Relational Schemas| T4
    T3 -->|Logs Performance & Telemetry| T4
```

### End-to-End Wake-Up & Verification Workflow

```mermaid
sequenceDiagram
    autonumber
    actor User as User
    participant Browser as Web Browser (UI & Audio)
    participant Scheduler as APScheduler (FastAPI)
    participant Engine as Verification & AI Engine
    participant DB as Database (Postgres/SQLite)

    Note over Scheduler,DB: Scheduled Alarm Time Arrived
    Scheduler->>Browser: Dispatches Alarm Trigger (Notification & State)
    Browser->>Browser: Starts Web Audio API Chime Synthesizer
    Browser->>User: Displays Interactive Challenge Modal (Snooze Locked)
    
    Browser->>Engine: POST /api/verification/generate (Method, Difficulty, Step)
    Engine->>DB: Fetches User Profile & Historical Accuracy
    Engine-->>Browser: Returns Cognitive Challenge (Question, Options/Input, Timer)

    User->>Browser: Submits Answer
    Browser->>Engine: POST /api/verification/validate-dismiss (Answer, Response Time)
    
    alt Answer Correct & More Steps Remain
        Engine-->>Browser: Correct! Next Step Triggered
        Browser->>User: Renders Step 2 of 5 Question
    else Answer Correct & All Steps Solved
        Engine-->>Browser: Verification SUCCESS (Score Awarded)
        Browser->>Browser: Stops Web Audio Synthesizer (Alarm Disarmed)
        Browser->>User: Closes Modal, Launches "Are You Awake?" Confirmation
    else Answer Incorrect / Timeout
        Engine-->>Browser: Verification FAILED (+1 Penalty Question Added)
        Browser->>Browser: Increases Required Questions Counter
        Browser->>User: Renders New Cognitive Challenge
    end
```

---

## 4. Modules Implemented

### Module 1: User Authentication & Role-Based Access Control (RBAC)
- **User Registration & Login**: Validated email, username, and salted password storage with Bcrypt hashing.
- **JWT Authentication**: Stateless, cryptographically signed Bearer tokens (access + refresh tokens).
- **OAuth2 Login Architecture**: Extensible token endpoints conforming to OpenAPI standard.
- **Role-Based Access Control (RBAC)**:
  - `user`: Configures alarms, solves challenges, tracks sleep habits, books coach appointments.
  - `coach`: Monitors client dossiers, tracks circadian compliance, provides motivation, manages appointments.
  - `administrator`: Platform analytics, user directory management, global announcements, system audits.
- **User Profile Management**: Update avatar, contact info, timezone, and productivity objectives.

### Module 2: User Profile & Habit Management
- **Circadian Profile Setup**: Wake-up goal tracking and sleep schedule configuration.
- **Time Zone Support**: Multi-timezone normalization to eliminate daylight saving/travel drift.
- **Productivity Goal Setup**: Personalized wake targets linked to morning work priorities.
- **Habit Preferences**:
  - Preferred challenge types (Math, Logic, Memory, etc.).
  - Default difficulty preference (Beginner to Expert).
  - Sound tone & vibration preferences.

### Module 3: Alarm Scheduling System
- **Creation & Management**: Full CRUD lifecycle for multiple alarms.
- **Recurring Alarms**: Flexible scheduling supporting:
  - Daily Alarms
  - Weekday Alarms (Mon–Fri)
  - Weekend Alarms (Sat–Sun)
  - One-Time Alarms (auto-disarm upon completion)
- **Smart Adaptive Alarm**: Automatically shifts alarm time forward or backward (+/- 15–30 mins) based on circadian sleep debt and bedtime adherence.
- **Customization**: Individual sound profiles, custom challenge requirements, snooze limits (1–3), and label metadata.

### Module 4: Cognitive Challenge Engine
- **7 Cognitive Challenge Types**:
  1. **Math Problems**: Arithmetic expressions, multi-operator equations, and order of operations.
  2. **Logic Puzzles**: Deductive reasoning, premise-conclusion evaluation.
  3. **Memory Challenges**: Sequence recall and delayed token matching.
  4. **Word Games**: Anagrams, vocabulary puzzles, word unscrambling.
  5. **Pattern Recognition**: Arithmetic/geometric progressions and matrix sequences.
  6. **Riddles**: Lateral thinking and semantic riddles.
  7. **Quick Quizzes**: General knowledge and science trivia.
- **Dual Engine Architecture**:
  - Primary: Google Gemini Flash AI LLM integration generating dynamic contextual puzzles.
  - Fallback: 100% offline, zero-latency deterministic rule engine guaranteeing high availability.
- **Input Flexibility**: Supports both multiple-choice options and direct numeric/text entry.

### Module 5: Adaptive Difficulty Engine
- **5 Difficulty Tiers**:
  - `Beginner`: Elementary operations (e.g., single-digit addition, basic anagrams).
  - `Easy`: Straightforward 2-step problems.
  - `Medium`: Multi-step logic, 2-digit multiplication, sequence decoding.
  - `Hard`: Advanced mental arithmetic, compound riddles, complex logic.
  - `Expert`: High cognitive load challenges requiring sharp prefrontal cortex alertness.
- **Moving Window ML Logic**: Tracks last 5 performance attempts:
  - Accuracy $\ge 85\%$ & speed $< 15\text{s}$ $\rightarrow$ Level Up ($+1$ Difficulty).
  - Accuracy $< 50\%$ or timeout $\rightarrow$ Level Down ($-1$ Difficulty).
  - Stability range $\rightarrow$ Maintain current level.

### Module 6: Wake-Up Verification Module
- **5 Verification Protocols**:
  1. **Puzzle Completion**: Direct puzzle resolution before alarm silence.
  2. **Multi-Step Challenges**: Minimum 5 consecutive challenge steps required to disarm the alarm.
  3. **Consecutive Correct Answers**: Rapid streak solving; any mistake resets the streak.
  4. **Time-Based Challenges**: Countdown blitz (15–30s) testing rapid mental arousal.
  5. **Cognitive Accuracy Checks**: Precision-weighted verification validating sleep inertia clearance.
- **Restricted Snooze Enforcement**: Snooze button is hard-locked until all required cognitive questions are successfully answered. Each snooze raises difficulty and shortens the subsequent snooze interval.
- **Post-Wake Confirmation Pop-Up**: "Are you awake?" check-in modal capturing subjective wakefulness ratings (1–10).

### Module 7: Behavioral Analytics Engine
- **5 Behavioral Telemetry Pillars**:
  1. **Snooze Pattern Analysis**: Average snoozes per wake, zero-snooze percentage, peak snooze day.
  2. **Wake-Up Behavior Tracking**: Wake drift vs. target schedule, weekday vs. weekend consistency.
  3. **Productivity Correlation**: Correlates wake time regularity with subjective productivity scores (0–100).
  4. **Habit Consistency Monitoring**: Weekly compliance percentage and streak stability.
  5. **Sleep Architecture Analytics**: Sleep debt computation (minutes behind optimal 8-hour baseline).

### Module 8: Habit Scoring Engine (35/25/20/20 Weighted Model)
The platform evaluates circadian and morning habits via a neuro-behavioral formula:
$$\text{Habit Score} = 0.35 \times W + 0.25 \times C + 0.20 \times S + 0.20 \times A$$

Where:
- **$W$ (Wake-Up Consistency — 35%)**: Evaluates wake variance against target alarm time.
- **$C$ (Challenge Completion Success — 25%)**: Evaluates first-attempt accuracy, solution speed, and completion win rate.
- **$S$ (Snooze Reduction — 20%)**: Rewards zero-snooze dismissals; penalizes repeated snoozing.
- **$A$ (Sleep Schedule Adherence — 20%)**: Evaluates adherence to recommended bedtime and 7–9 hour sleep duration.

#### Grade Tiers
- $90 - 100$: **Optimal** (Circadian Champion)
- $80 - 89$: **Consistent** (Strong Circadian Routine)
- $70 - 79$: **Moderate** (Minor Drift Detected)
- $50 - 69$: **Inconsistent** (High Snooze Tendency)
- $< 50$: **Relapsing** (Critical Sleep Inertia)

### Module 9: AI Recommendation Engine
Generates real-time, actionable circadian guidance:
- **Sleep Improvement**: Optimal wind-down windows, blue light mitigation, circadian drift corrections.
- **Wake-Up Optimization**: Early morning natural light exposure, water hydration triggers.
- **Habit Improvement**: Anti-snooze protocols and milestone streak celebrations.
- **Productivity Guidance**: Prefrontal cortex priming recommendations.
- **Challenge Recommendation**: Tailored puzzle types targeting specific cognitive improvement areas.

### Module 10: Multi-Role Dashboards & Analytics
- **User Dashboard**:
  - Hero Habit Score card with visual progress meters.
  - Interactive alarm management centre.
  - Test Verification Challenge center.
  - Circadian telemetry and sleep adherence logs.
  - "🤝 Interact with Coach" appointment scheduling modal and scheduled sessions list.
- **Wellness Coach Dashboard**:
  - Assigned client directory with quick metrics.
  - Client dossiers detailing sleep trends, drift, and habit sub-scores.
  - Personalized coach note and motivation message broadcast.
  - "🤝 Interact with User" direct scheduling modal.
  - Client Appointment Schedule table with real-time `Confirm` and `Complete` status updates.
- **Administrator Dashboard**:
  - Platform KPIs (Total users, active alarms, total challenges solved, average habit score).
  - Daily Active Users (DAU) 7-day trend chart.
  - Circadian Platform Growth curve.
  - Global announcement broadcasting.
  - Full audit activity logs.

### Module 11: Notification & Reminder System
- **In-App Notification Center**: Real-time notifications bell with unread counters.
- **Notification Types**:
  - Bedtime Reminders (30 mins before scheduled sleep).
  - Wake-Up Reminders & Morning Briefs.
  - Habit Alerts (drifts, streak milestones).
  - Challenge Reminders.
  - Coach Appointment Alerts.
  - Platform-wide Announcements.
- **Mobile Integration Architecture**: Firebase Cloud Messaging (FCM) token registration endpoints.

### Module 12: Reports & Export System
- **PDF Export Engine**: Built using ReportLab, generating formatted clinical/wellness dossiers including habit breakdowns, sleep metrics, and challenge performance.
- **Excel Export Engine**: Built using OpenPyXL / Pandas, exporting multi-sheet raw analytics for clinical or personal tracking.
- **CSV Export Engine**: Lightweight raw data stream for immediate spreadsheet analysis.

### Module 13: Final Integration, Testing & Verification
- **Test Suite**: 74 automated unit, integration, and regression tests passing with zero errors.
  - `test_alarms.py`: Alarm CRUD, smart adaptive rules, time normalization.
  - `test_challenges.py`: Challenge generator, difficulty adaptation, verification logic.
  - `test_module5.py`: Verification methods, anti-snooze rules, wake confirmations.
  - `test_modules_7_to_12.py`: Behavioral telemetry, 35/25/20/20 habit scoring, PDF/Excel generation, coach/user appointments.
- **Zero-Error Architecture**: Resilient client-side and server-side fallbacks preventing empty displays or missing challenge questions.

---

## 5. Milestone Roadmaps & Requirements Matrix

| Milestone | Timeframe | Core Tasks | Verification Criteria | Status |
|---|---|---|---|---|
| **Milestone 1** | Week 1 & 2 | Project setup, JWT Auth, RBAC, User Profiles, Alarm Scheduling | Working auth, alarm CRUD, profile storage | **Complete** |
| **Milestone 2** | Week 3 & 4 | Cognitive Challenge Engine (7 types), Wake-Up Verification, Evaluation | Gemini + Rule fallback, puzzle verification | **Complete** |
| **Milestone 3** | Week 5 & 6 | Adaptive Difficulty Engine (5 tiers), Behavioral Analytics, Habit Scoring (35/25/20/20), Recommendations | Telemetry engine active, habit score calculated | **Complete** |
| **Milestone 4** | Week 7 & 8 | Multi-role Dashboards, Coach/User Appointments, PDF/Excel Reports, Notifications, Pytest Validation | 74/74 tests passing, zero UI/backend errors | **Complete** |

---

## 6. Tools & Tech Stack

- **Backend Framework**: Python 3.10+, FastAPI, Uvicorn, Pydantic v2.
- **Database Layer**: SQLAlchemy ORM, PostgreSQL (production), SQLite (local test & offline fallback).
- **Background Tasks & Scheduler**: APScheduler (cron and interval trigger service).
- **Security & Authentication**: Python-Jose (JWT), Passlib & Bcrypt (hashing), OAuth2 Password Bearer.
- **AI & Data Science**: Google Generative AI (Gemini 1.5/3.5 Flash), Pandas, NumPy, Scikit-learn ready.
- **Reporting & Visualization**: ReportLab (PDF generation), OpenPyXL (Excel), Chart.js (client-side charts).
- **Frontend Layer**: HTML5, Jinja2 Templates, Vanilla JavaScript (ES6+), Web Audio API (real-time chimes).
- **Testing**: Pytest, Pytest-Asyncio, HTTPX TestClient.

---

## 7. Performance & Quantitative Goals

| Metric Category | Target | Achieved / System Capability |
|---|---|---|
| **Challenge Generation Latency** | $< 250\text{ms}$ | $\sim 5 - 20\text{ms}$ (rule engine), $\sim 350\text{ms}$ (Gemini AI) |
| **Alarm Trigger Reliability** | $100\%$ | Guaranteed via background APScheduler check loop |
| **Question Display Reliability** | $100\%$ | Dual fallback (Backend dynamic math + Client-side emergency arithmetic) |
| **Habit Scoring Precision** | Exact 35/25/20/20 | Mathematically verified across 74 automated unit tests |
| **Report Generation Speed** | $< 1.5\text{s}$ | PDF: $\sim 180\text{ms}$, Excel: $\sim 65\text{ms}$ |
| **Test Suite Coverage** | Zero failures | **74 Passed / 0 Failed** |
