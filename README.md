# Intelligent Cognitive Alarm Platform (v2)

A full-stack cognitive alarm app: FastAPI backend + a single-page vanilla
HTML/CSS/JS frontend (no build step). Every number shown in the UI is real
data from your own database — nothing is hardcoded or faked for show.

## What's genuinely implemented

| Area | Status |
|---|---|
| Auth & Roles | ✅ JWT auth, signup with role choice (User / Wellness Coach), 3 seeded demo accounts (Admin/Coach/User) for one-click login |
| Alarm Scheduling | ✅ create/list/toggle/delete, repeat rules, per-alarm challenge type + difficulty + multi-step verification count |
| Cognitive Challenge Engine | ✅ math / logic / memory / riddle generators, scaled by difficulty |
| Wake-Up Verification | ✅ full-screen ringing modal: countdown timer, multi-step challenges, failed-attempt counter, score, snooze lock after max snoozes |
| Habit Scoring | ✅ exact weighted formula (Wake Consistency 35% / Challenge Success 25% / Snooze Reduction 20% / Sleep Adherence 20%) |
| Behavioral Analytics | ✅ real charts (Chart.js) — accuracy trend, difficulty progression, challenge-type breakdown, snoozes by weekday — all computed from your attempt history |
| AI Personalization | ⚠️ **rule-based**, not a trained ML model — snooze risk %, optimal bedtime, best challenge type, and difficulty recommendation are all computed with simple, explainable formulas from your real data. Labeled honestly in the UI. |
| Role-Based Access Control | ✅ real server-side enforcement — an Admin/Wellness Coach-only page lists all users + habit scores; a regular user hitting that API gets a genuine 403 |
| Reports & Export | ✅ real PDF (via reportlab) and CSV downloads of your habit score + attempt history |
| Profile Settings | ✅ mobile-alarm-app style settings: snooze duration, max snoozes, ringtone choice, vibration toggle, gradual volume toggle, emoji avatar picker, dark/light theme |
| Google Sign-In | ❌ UI button present but intentionally inert — real Google OAuth needs a Google Cloud project + client credentials, which aren't something I can fabricate. Clicking it explains this rather than faking a login. |
| Notifications / real background alarm ringing | ❌ not built — alarms are triggered manually via "Simulate Ring" rather than firing at the actual clock time in the background |
| Docker / cloud deployment | ❌ not built — runs locally via `uvicorn` |

## Tech stack

- **Backend:** Python, FastAPI, SQLAlchemy (SQLite by default — one line in
  `app/database.py` to swap to PostgreSQL), JWT auth, bcrypt password hashing,
  reportlab for PDF generation.
- **Frontend:** Plain HTML/CSS/JS, Chart.js (via CDN) for charts. No npm, no
  build step. Served directly by the FastAPI backend.

## Folder structure

```
alarm-platform/
├── backend/
│   ├── app/
│   │   ├── main.py            # FastAPI entrypoint, serves frontend, seeds demo accounts
│   │   ├── seed.py            # Creates the 3 demo accounts on startup
│   │   ├── database.py
│   │   ├── models.py          # User, Alarm, ChallengeAttempt, Feedback
│   │   ├── schemas.py
│   │   ├── auth.py            # JWT + bcrypt + require_role() for RBAC
│   │   ├── routers/
│   │   │   ├── auth.py        # register/login/demo-login/profile
│   │   │   ├── alarms.py
│   │   │   ├── challenges.py  # generate/submit/snooze/history
│   │   │   ├── dashboard.py   # habit score + day streak
│   │   │   ├── analytics.py
│   │   │   ├── personalization.py
│   │   │   ├── admin.py       # role-gated: list all users
│   │   │   ├── reports.py     # PDF + CSV export
│   │   │   └── feedback.py
│   │   └── services/
│   │       ├── challenge_service.py
│   │       ├── habit_scoring.py
│   │       ├── analytics_service.py
│   │       └── personalization_service.py
│   └── requirements.txt
└── frontend/
    ├── index.html    # landing + auth + full app shell (all 8 pages) + 2 modals
    ├── css/style.css # teal/amber theme, background art, animations
    └── js/
        ├── api.js
        └── app.js
```

## How to run it

**Requirements:** Python 3.10–3.12 recommended (very new Python versions like
3.14 may lack prebuilt wheels for some dependencies).

```bash
cd alarm-platform/backend
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Mac/Linux
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Open **http://localhost:8000**.

## Trying it out

- Click **Get Started** to sign up (choose Standard User or Wellness Coach),
  or use a **Quick Demo Login** (Admin / Coach / User) on the sign-in screen
  — no registration needed.
- **Alarm Centre** → Create Alarm → pick a challenge type, difficulty, and
  how many verification steps it takes to disarm.
- Click **Simulate Ring** on any alarm card to open the full wake-up
  verification flow (timer, multi-step challenges, snooze with a lockout).
- **Analytics** and **AI Personalization** fill in with real charts/insights
  once you've completed a few challenges — they're honestly empty at first,
  not padded with fake numbers.
- **Habit & Verification** → Recalculate Score / Test Verification Challenge
  / download PDF or CSV reports.
- Log in with the **Admin** or **Coach** demo account to see the
  role-gated **Admin Panel** listing every user's habit score.

## API reference

Interactive docs (Swagger UI) auto-generated at **http://localhost:8000/docs**.

## Suggested next steps

1. **Real background alarm firing** — currently alarms only "ring" when you
   click Simulate Ring. A real version needs either a service worker +
   Notifications API (web) or a native alarm scheduler (mobile).
2. **Real ML for AI Personalization** — swap the rule-based formulas in
   `services/personalization_service.py` for a model trained on real usage
   data (needs a lot more data than one person's demo usage to be worthwhile).
3. **Google OAuth** — wire up `authlib` or `fastapi-sso` with a real Google
   Cloud OAuth client ID/secret.
4. **PostgreSQL + Docker** — change one line in `database.py`, then add a
   `Dockerfile` + `docker-compose.yml`.
