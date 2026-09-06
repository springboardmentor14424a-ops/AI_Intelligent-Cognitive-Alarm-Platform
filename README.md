# Intelligent Cognitive Alarm & Behavioral Health Platform

> **Milestone 3 & 4 Release: Adaptive Intelligence, Behavioral Telemetry, Habit Scoring, Recommendation Engine, Reports, Notifications & Dockerization.**

---

## 🌟 Platform Overview

The **Intelligent Cognitive Alarm Platform** is a full-stack, enterprise-grade behavioral health and cognitive readiness system designed to eliminate morning sleep inertia, build long-term habit discipline, and provide real-time performance telemetry.

Unlike traditional passive alarm clocks, this platform enforces **Prefrontal Cortex Activation** via dynamic cognitive challenges (Math, Logic, Memory, Word, Pattern, Riddle, Quiz) before an alarm can be dismissed. It continuously analyzes user wake-up latency, snooze frequency, sleep schedule adherence, and challenge accuracy to dynamically adjust difficulty levels and deliver explainable behavioral recommendations.

---
<!--
## 🏗️ System Architecture & Workflow

```mermaid
graph TD
    A["User Authentication / Demo Login"] -> B["Role Routing (User / Coach / Admin)"]
    B -> C["User Dashboard & Habit Manager"]
    C -> D["Smart Adaptive Alarm Creation"]
    D -> E["Alarm Trigger & Scheduler"]
    E -> F["Cognitive Challenge Engine"]
    F -> G["Wake-up Verification"]
    G -> H["Behavioral Telemetry Log"]
    H -> I["Weighted Habit Score (0-100)"]
    I -> J["Adaptive Difficulty Engine"]
    J -> K["Recommendation Engine"]
    K -> L["Analytics Dashboard & Reports"]
```

### Complete End-to-End Workflow:
1. **User Login & Session Management**: Secure JWT authentication supporting User, Coach, and Admin roles.
2. **Role-Based Dashboards**: Tailored views for individual users, supervising coaches, and system administrators.
3. **Habit & Alarm Management**: Scheduling smart adaptive alarms and tracking daily behavioral streaks.
4. **Cognitive Challenge Engine**: Dynamically generates multi-level puzzles across 7 categories.
5. **Wake-up Verification**: Verifies complete awakening upon puzzle submission within strict time windows.
6. **Behavioral Telemetry**: Logs snooze events, wake-up delays, challenge response times, and sleep quality.
7. **Weighted Habit Score**: Calculates standard $0-100$ score based on:
   - **Wake-Up Consistency (35%)**
   - **Challenge Completion Success (25%)**
   - **Snooze Reduction Rate (20%)**
   - **Sleep Schedule Adherence (20%)**
8. **Adaptive Difficulty Engine**: Rule-based engine adjusting puzzle difficulty across 5 levels (`beginner`, `easy`, `medium`, `hard`, `expert`) with ML model interface compatibility.
9. **Explainable Recommendation Engine**: Personalized, rule-driven advice to optimize circadian rhythms and productivity.
10. **Reports & Exports**: Customizable report generator supporting CSV, HTML/PDF, and JSON formats.

---

## 🛠️ Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend Framework** | React 18 + TypeScript + Vite |
| **Styling & Icons** | Vanilla CSS Design System + TailwindCSS + React Icons |
| **State & Navigation** | React Router v6 + Context API + React Hook Form + Zod |
| **Backend Framework** | Node.js + Express + TypeScript |
| **Database & ORM** | PostgreSQL 15 + Drizzle ORM + Drizzle Kit |
| **Auth & Security** | JSON Web Tokens (JWT) + Bcryptjs + CORS + Role Middleware |
| **Visualization** | Custom SVG Data Charts & Dynamic Telemetry Gauges |
| **Containerization** | Docker + Docker Compose multi-stage builds |

---

## 🔑 Demo Credentials

| Role | Email | Password | Access Level |
| :--- | :--- | :--- | :--- |
| **User** | `user@cognitivealarm.com` | `User@123` | Personal Alarms, Habits, Analytics, Reports |
| **Coach** | `coach@cognitivealarm.com` | `Coach@123` | Trainee Supervision, Detailed User Inspection |
| **Admin** | `admin@cognitivealarm.com` | `Admin@123` | System Control, Platform Stats, Full Management |

*(Additional standard seed accounts: `user@example.com`, `coach@example.com`, `admin@example.com` with same default passwords).*

---

## 📁 Repository Structure

```
Intelligent_Cognitive_Alarm/
├── Dockerfile                    # Multi-stage production build
├── docker-compose.yml            # Postgres, Backend, Frontend orchestration
├── .dockerignore
├── package.json
├── client/                       # Frontend Vite React App
│   ├── src/
│   │   ├── api/                  # Axios HTTP client configuration
│   │   ├── components/           # UI elements, NotificationCenter, ReportsModal
│   │   ├── context/              # Auth & Global context providers
│   │   ├── pages/                # Dashboards, UserAnalytics, Habits, Alarms, Challenges
│   │   ├── services/             # Client API service wrappers
│   │   └── types/                # TypeScript interface definitions
│   ├── package.json
│   └── vite.config.ts
└── server/                       # Backend Express Node API
    ├── src/
    │   ├── config/               # Environment & App configuration
    │   ├── controllers/          # Route handlers (Auth, Analytics, Habits, Alarms, Reports)
    │   ├── db/                   # Database connection & Drizzle schemas
    │   │   ├── schema/           # Users, Profiles, Habits, Alarms, SnoozeLogs, SleepLogs, Notifications
    │   │   └── init.ts           # Schema auto-initializer & Seed generator
    │   ├── middleware/           # Auth JWT, Role verification, Error handlers
    │   ├── routes/               # API route definitions
    │   ├── services/             # Intelligence Engines (Adaptive, HabitScore, Analytics, Reports)
    │   └── tests/                # Automated Node test suite
    └── package.json
```

---

## ⚙️ Environment Variables

Create `.env` files in `server/` or pass via environment variables:

```env
# Server (.env)
PORT=5000
NODE_ENV=development
DATABASE_URL=postgresql://postgres:postgrespassword@localhost:5432/cognitive_alarm_db
JWT_SECRET=cognitive_alarm_secure_jwt_secret_key_2026
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:3000
```

---

## 🚀 Running Locally

### Option A: Local Node Environment

1. **Install Dependencies**:
   ```bash
   # Install server dependencies
   cd server && npm install

   # Install client dependencies
   cd ../client && npm install
   ```

2. **Start Backend Server**:
   ```bash
   cd server
   npm run dev
   ```
   *The server runs on `http://localhost:5000` with automatic PostgreSQL schema initialization and development fallback mode.*

3. **Start Frontend Web App**:
   ```bash
   cd client
   npm run dev
   ```
   *The web application will open at `http://localhost:3000`.*

---

### Option B: Running with Docker Compose (Recommended)

To start the complete application (PostgreSQL Database, Backend API, Frontend React App) with a single command:

```bash
docker-compose up --build
```

- **Frontend Application**: `http://localhost:3000`
- **Backend API**: `http://localhost:5000/api`
- **PostgreSQL Database**: `localhost:5432`

---

## 🧪 Automated Testing

Run the comprehensive unit & integration test suite:

```bash
# Run backend test suite
npx tsx server/src/tests/api.test.ts

# Verify frontend build & TypeScript types
npm --prefix client run build
```

---

## 📡 API Reference Summary

### Authentication APIs
- `POST /api/auth/register` — Register new user account
- `POST /api/auth/login` — Authenticate and obtain JWT
- `GET /api/auth/me` — Fetch current user context

### Behavioral Analytics & Intelligence APIs
- `GET /api/analytics/overview` — Executive telemetry & weekly trends
- `GET /api/analytics/wakeup` — Wake-up delay logs & consistency rates
- `GET /api/analytics/challenges` — Challenge accuracy & speed breakdown
- `GET /api/analytics/habits` — Habit streaks & adherence rates
- `GET /api/analytics/snooze` — Snooze frequency & reduction statistics
- `GET /api/analytics/recommendations` — Explainable behavioral guidance
- `GET /api/analytics/adaptive-difficulty` — Adaptive Difficulty Engine output

### Habit Scoring & Alarms APIs
- `GET /api/habits/score` — Compute weighted 0-100 Habit Score
- `GET /api/alarms` — List scheduled alarms
- `POST /api/alarms` — Create smart adaptive alarm

### Reports & Export APIs
- `GET /api/reports/view?type=...` — Render interactive report JSON
- `GET /api/reports/export?type=...&format=csv|pdf|json` — Download report files

### Notification APIs
- `GET /api/notifications` — Fetch user in-app notifications
- `PATCH /api/notifications/:id/read` — Mark notification read

---

## 📜 License & Acknowledgments

Developed as part of the **Intelligent Cognitive Alarm Platform** project under open development architecture.
