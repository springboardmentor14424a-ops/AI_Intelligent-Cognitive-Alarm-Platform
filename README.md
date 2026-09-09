# 🧠 Cognitive Alarm Platform

> **Wake up. Solve. Own your morning.**

A full-stack **Intelligent Cognitive Alarm Platform** that turns waking up into an interactive challenge.

Instead of simply dismissing an alarm, users solve cognitive challenges, build better wake-up habits, track their progress, and receive personalized insights based on their real activity.

🌐 **Live Demo:**  
https://ai-intelligent-cognitive-alarm-platform.onrender.com

---

## ✨ What Makes It Different?

Traditional alarms ask:

> 😴 "Do you want to snooze?"

Cognitive Alarm asks:

> 🧠 "Are you actually awake?"

The platform combines **alarm management, cognitive challenges, habit scoring, analytics, personalization, and role-based access control** into one application.

---

## 🚀 Features

### 🔐 Authentication & User Management

- JWT-based authentication
- User registration and login
- Google OAuth sign-in
- Role-based accounts:
  - 👤 Standard User
  - 🧑‍🏫 Wellness Coach
  - 👑 Admin
- Quick demo login for testing different roles
- Secure password hashing with bcrypt

### ⏰ Intelligent Alarm Centre

- Create, edit, toggle and delete alarms
- Repeating alarm schedules
- Custom challenge type
- Adjustable challenge difficulty
- Multi-step wake-up verification
- Snooze limits and configurable snooze duration

### 🧠 Cognitive Challenge Engine

Choose from different challenge types:

- ➗ Math
- 🧩 Logic
- 🧠 Memory
- ❓ Riddles

Challenge difficulty automatically scales according to the selected level.

### 🌅 Wake-Up Verification

When an alarm is simulated:

- Full-screen ringing interface
- Countdown timer
- Multi-step challenges
- Failed-attempt tracking
- Wake-up score
- Snooze tracking
- Snooze lockout after maximum attempts

### 📊 Habit Scoring

The platform calculates a habit score using:

| Metric | Weight |
|---|---:|
| Wake Consistency | 35% |
| Challenge Success | 25% |
| Snooze Reduction | 20% |
| Sleep Adherence | 20% |

All displayed scores are calculated from the user's actual activity data.

### 📈 Behavioral Analytics

Interactive Chart.js visualizations for:

- Accuracy trends
- Difficulty progression
- Challenge-type distribution
- Snoozes by weekday
- Attempt history

No fake statistics are added just to make the dashboard look impressive.

### 🤖 AI Personalization

The current personalization system is **rule-based rather than a trained ML model**.

It generates explainable recommendations such as:

- 💤 Snooze risk percentage
- 🌙 Optimal bedtime
- 🧩 Recommended challenge type
- 📊 Recommended difficulty

The recommendations are calculated using the user's actual activity data.

> **Note:** This is intentionally labeled as rule-based AI in the application rather than being presented as a trained machine-learning model.

### 🛡️ Role-Based Access Control

Real server-side authorization is implemented.

- Admin and Wellness Coach users can access the administrative user list.
- Regular users cannot access protected admin APIs.
- Unauthorized access returns a genuine **403 Forbidden** response.

### 📄 Reports & Export

Users can export their data as:

- 📑 PDF reports
- 📊 CSV files

Reports include habit scores and challenge attempt history.

### ⚙️ Profile & Personalization Settings

Users can customize:

- Snooze duration
- Maximum snoozes
- Ringtone
- Vibration
- Gradual volume
- Emoji avatar
- Dark / light theme
- Sleep preferences
- Challenge preferences

---

## 🛠️ Tech Stack

### Backend

- **Python**
- **FastAPI**
- **SQLAlchemy**
- **SQLite**
- **JWT Authentication**
- **bcrypt**
- **Google OAuth**
- **ReportLab**

### Frontend

- **HTML5**
- **CSS3**
- **Vanilla JavaScript**
- **Chart.js**

No React, npm, or frontend build system is required.

The frontend is served directly by the FastAPI backend.

### Deployment

- **GitHub**
- **Render**
- Public HTTPS deployment

---

## 📁 Project Structure

```text
alarm-platform/
│
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── seed.py
│   │   ├── database.py
│   │   ├── models.py
│   │   ├── schemas.py
│   │   ├── auth.py
│   │   │
│   │   ├── routers/
│   │   │   ├── auth.py
│   │   │   ├── alarms.py
│   │   │   ├── challenges.py
│   │   │   ├── dashboard.py
│   │   │   ├── analytics.py
│   │   │   ├── personalization.py
│   │   │   ├── admin.py
│   │   │   ├── reports.py
│   │   │   └── feedback.py
│   │   │
│   │   └── services/
│   │       ├── challenge_service.py
│   │       ├── habit_scoring.py
│   │       ├── analytics_service.py
│   │       └── personalization_service.py
│   │
│   └── requirements.txt
│
├── frontend/
│   ├── index.html
│   ├── css/
│   │   └── style.css
│   └── js/
│       ├── api.js
│       └── app.js
│
├── .gitignore
└── README.md