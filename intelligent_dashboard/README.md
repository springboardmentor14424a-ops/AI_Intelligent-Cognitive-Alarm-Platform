# 🧠 AI Intelligent Cognitive Alarm Platform

A smart alarm system built with FastAPI that adapts to your sleep habits and wakes you up at the right time.

## Features

- **Alarm Management** — Create, update, delete, enable/disable alarms
- **Alarm Types** — Daily, Weekday, Weekend, One-Time, Smart Adaptive
- **AM/PM Time Picker** — Set alarms using 12-hour or 24-hour format
- **Smart Adaptive Alarm** — Adjusts wake time based on your habit score and streak
- **Live Notifications** — Browser popup + in-app notifications when alarm fires
- **FCM Push Notifications** — Firebase Cloud Messaging for mobile devices
- **Background Scheduler** — APScheduler runs every minute to fire alarms automatically
- **JWT Authentication** — Secure login with Google OAuth support
- **Role-Based Access** — Admin, Coach, and User dashboards

## Tech Stack

- **Backend** — FastAPI (Python)
- **Database** — PostgreSQL (SQLite fallback for local dev)
- **Auth** — JWT + Google OAuth
- **Scheduling** — APScheduler
- **Notifications** — Firebase Cloud Messaging (FCM)
- **Validation** — Pydantic

## Setup

```bash
# Install dependencies
pip install -r requirements.txt

# Run the server
python app.py
```

Server runs at: `http://127.0.0.1:8000`

## Demo Login

| Role  | Username | Password |
|-------|----------|----------|
| Admin | admin    | admin123 |
| Coach | coach    | coach123 |
| User  | user     | user123  |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/alarms` | Create alarm |
| GET | `/alarms` | List all alarms |
| GET | `/alarms/{id}` | Get single alarm |
| PUT | `/alarms/{id}` | Update alarm |
| DELETE | `/alarms/{id}` | Delete alarm |
| PATCH | `/alarms/{id}/enable` | Enable alarm |
| PATCH | `/alarms/{id}/disable` | Disable alarm |
| GET | `/alarms/today` | Today's alarms |
| GET | `/alarms/upcoming` | Upcoming alarms |
| POST | `/alarms/check-next` | Next alarm with Smart Adaptive |

API docs: `http://127.0.0.1:8000/docs`

## Module 3 Deliverables ✅

- [x] Alarm CRUD APIs  
- [x] PostgreSQL schema  
- [x] Alarm scheduling service  
- [x] Recurring alarm logic  
- [x] Multiple alarm support  
- [x] Alarm customization (sound, vibration, snooze, difficulty)  
- [x] Smart Adaptive alarm (rule-based)  
- [x] Notification integration (FCM + in-app)  
- [x] Input validation (Pydantic)  
- [x] Testing (21 tests all passing)
