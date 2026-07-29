# Intelligent Cognitive Alarm Platform

This repository begins with Module 1: secure authentication, role-based access, and user profile management for the Intelligent Cognitive Alarm Platform.

## Delivered module

- Account registration with unique email validation and PBKDF2-HMAC-SHA256 password hashing.
- OAuth2-compatible password login endpoint that returns a signed, expiring JWT bearer token.
- Roles: `user` (default), `wellness_coach`, and `administrator`.
- Role-protected coach and administrator examples, including administrator-controlled role assignment.
- Authenticated profile viewing and updates, with alarm-relevant preferences.
- A small browser interface for registration, sign-in, and profile viewing.

## Modules 2-5 delivered

- Habit profile management: bedtime, wake-up goal, productivity goal, and habit preferences.
- Alarm scheduling: daily, weekday, weekend, one-time, and smart adaptive alarm types, with dismissal tracking.
- Cognitive challenge engine: math, logic, and riddle challenges with answer validation.
- Adaptive difficulty: recommends beginner through expert difficulty from the most recent challenge results.

## Run locally

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
$env:JWT_SECRET = "use-a-long-random-production-secret"
uvicorn app.main:app --reload
```

Open http://127.0.0.1:8000 and API documentation at http://127.0.0.1:8000/docs.

## API summary

| Method | Path | Access |
|---|---|---|
| POST | `/auth/register` | Public; new accounts are users |
| POST | `/auth/token` | Public; form fields `username`, `password` |
| GET/PATCH | `/auth/me` | Authenticated user |
| GET | `/coach/users` | Wellness Coach or Administrator |
| PATCH | `/admin/users/{user_id}/role` | Administrator |
| GET | `/admin/overview` | Administrator |
| GET/PUT | `/habits/me` | Authenticated user |
| GET/POST | `/alarms` | Authenticated user |
| PATCH/DELETE | `/alarms/{alarm_id}/dismiss` | Authenticated user |
| POST | `/challenges/generate` | Authenticated user |
| POST | `/challenges/{challenge_id}/submit` | Authenticated user |
| GET | `/adaptive/difficulty` | Authenticated user |

For an initial administrator, promote a user directly in the development database after they register:

```sql
UPDATE users SET role = 'administrator' WHERE email = 'admin@example.com';
```

In production, set this through a controlled bootstrap process and use a strong `JWT_SECRET` stored outside source control.
