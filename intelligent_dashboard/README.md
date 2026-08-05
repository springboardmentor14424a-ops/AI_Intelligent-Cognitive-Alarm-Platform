# AI Intelligent Cognitive Alarm Platform

An intelligent alarm management system built with FastAPI. The platform allows users to create, manage, and schedule alarms with smart adaptive features that adjust wake times based on sleep habits and habit scores.

## Features

- Alarm Management - Create, update, delete, enable and disable alarms
- Alarm Types - Daily, Weekday, Weekend, One-Time, and Smart Adaptive
- AM/PM Time Picker - Set alarms using 12-hour or 24-hour format
- Smart Adaptive Alarm - Adjusts wake time based on habit score and streak
- Live Notifications - Browser popup and in-app notifications when alarm fires
- FCM Push Notifications - Firebase Cloud Messaging support for mobile devices
- Background Scheduler - APScheduler runs every minute to fire alarms automatically
- JWT Authentication - Secure login with Google OAuth support
- Role-Based Access - Separate dashboards for Admin, Coach, and User roles

## Tech Stack

- Backend - FastAPI (Python 3.10)
- Database - PostgreSQL with SQLite fallback for local development
- Authentication - JWT and Google OAuth
- Scheduling - APScheduler (BackgroundScheduler)
- Notifications - Firebase Cloud Messaging (FCM)
- Validation - Pydantic V2

## Setup

```bash
# Install dependencies
pip install -r requirements.txt

# Run the server
python app.py
```

Server runs at: http://127.0.0.1:8000

API Documentation: http://127.0.0.1:8000/docs

## Demo Login Credentials

| Role  | Username | Password |
|-------|----------|----------|
| Admin | admin    | admin123 |
| Coach | coach    | coach123 |
| User  | user     | user123  |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST   | /alarms | Create a new alarm |
| GET    | /alarms | List all alarms |
| GET    | /alarms/{id} | Get a single alarm |
| PUT    | /alarms/{id} | Update an alarm |
| DELETE | /alarms/{id} | Delete an alarm |
| PATCH  | /alarms/{id}/enable | Enable an alarm |
| PATCH  | /alarms/{id}/disable | Disable an alarm |
| GET    | /alarms/today | Get today's alarms |
| GET    | /alarms/upcoming | Get upcoming alarms |
| POST   | /alarms/check-next | Get next alarm using Smart Adaptive logic |

## Module 3 Deliverables

- [x] Alarm CRUD APIs
- [x] PostgreSQL schema
- [x] Alarm scheduling service
- [x] Recurring alarm logic
- [x] Multiple alarm support
- [x] Alarm customization (sound, vibration, snooze, difficulty)
- [x] Smart Adaptive alarm (rule-based)
- [x] Notification integration (FCM and in-app)
- [x] Postman collection
- [x] 22 automated tests all passing
