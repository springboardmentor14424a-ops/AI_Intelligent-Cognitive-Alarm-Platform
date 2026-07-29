# AI Intelligent Cognitive Alarm Platform - Simplified Dashboard

This is a complete, self-contained, role-based application for the **AI Intelligent Cognitive Alarm Platform** utilizing Python FastAPI as the backend, and standard HTML/CSS/JavaScript with Jinja2 template rendering as the frontend (avoiding complex React compilation workflows for developer ease).

## Technology Stack

* **Backend Framework**: Python FastAPI
* **Frontend**: HTML5, custom Vanilla CSS, Javascript (served statically)
* **Template Engine**: Jinja2 Templates
* **Database**: PostgreSQL (via SQLAlchemy) with SQLite database fallback for immediate zero-config developer runs
* **Authentication**: JWT Cookie-based access tokens & refresh tokens, password hashing with bcrypt, mock Google OAuth bypass login
* **Charts & Analytics**: Chart.js (via CDN injection)
* **Reporting Utilities**: PDF, CSV, Excel streaming exports via pandas, openpyxl, and reportlab.

---

## Folder Structure

```
intelligent_dashboard/
├── database/
│   ├── schema.sql      # Production PostgreSQL DDL definition
│   └── seed.sql        # Demo mock data commands
│
├── routes/
│   ├── auth.py         # Login, Register, Logout cookie managers
│   ├── admin.py        # Account operations, logs audits, Excel/PDF exports
│   ├── user.py         # Profile variables updates, avatar uploads
│   ├── coach.py        # Client progress trackers, notes, motivator triggers
│   └── alarm.py        # Alarm scheduler CRUD, simulator wake up outcomes
│
├── static/
│   ├── css/
│   │   └── styles.css  # Premium Glassmorphism styling sheets
│   └── js/
│       └── app.js      # Modal triggers, toast helpers
│
├── templates/
│   ├── landing.html    # Core hero landing showcase
│   ├── login.html      # Authentication portal + demo logins autofill
│   ├── register.html   # System signup page
│   ├── admin.html      # KPI widgets, active directory tables, DAU charts
│   ├── user.html       # Alarms lists, wake streaker, sleep trends line-graphs
│   ├── coach.html      # Client selection sidebar, notes writer form
│   └── profile.html    # Token reset password screen
│
├── app.py              # Main FastAPI application entrypoint
├── database.py         # SQLAlchemy engine & metadata mapping
├── auth.py             # Security, JWT tokens generators, cookie checkers
├── config.py           # Settings configuration
└── requirements.txt    # Package dependencies
```

---

## Quick Start (Developer Setup)

### 1. Install Python packages
Under the project directory, run:
```bash
pip install -r requirements.txt
```

### 2. Launch application server
Start the FastAPI server:
```bash
python app.py
```

The application will launch immediately at:
* **App Feed**: [http://127.0.0.1:8000/](http://127.0.0.1:8000/)
* **Swagger OpenAPI Docs**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

*Note: On launch, the system automatically creates a local SQLite database (`alarm_platform.db`) and seeds it with mock admin, coach, and user accounts so you can review charts and directory logs right away.*

---

## Demo Credentials (Pre-seeded Accounts)

| Role | Username | Password | Notes |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin` | `admin123` | KPI counts, user CRUD operations, logs review, broadcast push. |
| **Wellness Coach** | `coach` | `coach123` | Monitor assigned users, recommendations notes updates. |
| **Standard User** | `user` | `user123` | Morning streak count, alarm locks CRUD, simulators widgets. |
| **Standard User (2)** | `emma` | `user123` | Active 14-day streak, top tier habit score. |

*(For testing, the Login page has quick-action buttons that automatically autofill and sign in to these accounts instantly!)*
