# ⏰ CogniWell — Intelligent Cognitive Alarm & Behavioral Health Platform

> **An AI-powered Intelligent Cognitive Alarm Platform** designed to help users build consistent wake-up habits, overcome sleep inertia, and maximize daily productivity by requiring personalized cognitive challenges (math, logic, memory puzzles) before alarm dismissal.

---

## 📋 Table of Contents
- [Project Overview](#-project-overview)
- [Key Outcomes & Objectives](#-key-outcomes--objectives)
- [System Architecture](#-system-architecture)
- [Core Modules & Features](#-core-modules--features)
  - [1. User Authentication & Role-Based Access Control (RBAC)](#1-user-authentication--role-based-access-control-rbac)
  - [2. Alarm Scheduling System](#2-alarm-scheduling-system)
  - [3. Cognitive Challenge Engine](#3-cognitive-challenge-engine)
  - [4. PostgreSQL Weighted Scoring Model](#4-postgresql-weighted-scoring-model)
  - [5. Recommendation Engine (7-Day Weekly Analysis)](#5-recommendation-engine-7-day-weekly-analysis)
  - [6. Dashboards & Behavioral Analytics](#6-dashboards--behavioral-analytics)
  - [7. Wellness Coach Communication](#7-wellness-coach-communication)
  - [8. Executive Reports & Export System](#8-executive-reports--export-system)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Installation & Local Setup](#-installation--local-setup)
- [API Documentation](#-api-documentation)
- [Deployment Guide (Vercel & Cloud)](#-deployment-guide-vercel--cloud)

---

## 🎯 Project Overview

Traditional alarms fail because they allow low-effort snoozing and instant dismissal while the brain is still experiencing **sleep inertia**. 

**CogniWell** solves this problem by requiring users to complete interactive, difficulty-calibrated cognitive tasks (Math problems, Memory cards, Logic riddles) before an alarm can be turned off. The platform tracks behavioral wake-up metrics, calculates a daily **Weighted Scoring Model** in PostgreSQL, generates dynamic 7-day weekly recommendations, and allows seamless interaction between users and assigned Wellness Coaches.

---

## 🚀 Key Outcomes & Objectives

- **Behavioral Habit Formation**: Reduces snooze frequency and builds long-term wake-up consistency.
- **Adaptive Cognitive Warm-up**: Calibrates puzzle difficulty (Beginner, Easy, Medium, Hard, Expert) based on historical solve speed and accuracy.
- **Quantified Habit Tracking**: Calculates a daily Habit Score stored in PostgreSQL using a weighted formula.
- **Personalized AI Recommendations**: Delivers targeted productivity protocols based on 7-day weekly analysis of user performance.
- **Role-Based Workflows**: Separate tailored interfaces for **Users**, **Wellness Coaches**, and **Administrators**.
- **Executive Reporting**: One-click download of comprehensive performance reports (Habit Score breakdown, Challenge performance, Productivity insights, and itemized logs).

---

## 📐 System Architecture

```
                               ┌─────────────────────────────────────────┐
                               │            CLIENT LAYER                 │
                               │   (React.js / Vite / SPA Dashboard)     │
                               └────────────────────┬────────────────────┘
                                                    │
                                                    │ HTTP / REST API (JWT Auth)
                                                    ▼
                               ┌─────────────────────────────────────────┐
                               │           API SERVER LAYER              │
                               │        (Node.js / Express Server)       │
                               └──────────┬──────────────────┬───────────┘
                                          │                  │
                ┌─────────────────────────┴──┐            ┌──┴─────────────────────────┐
                │   SERVICES & ENGINES       │            │    POSTGRESQL DATABASE     │
                │  - Auth & RBAC             │            │  - users                   │
                │  - Alarm Scheduler         │            │  - alarms                  │
                │  - Challenge Engine        │───────────>│  - alarm_sessions          │
                │  - Weighted Scoring Model  │            │  - "Weighted Scoring Model"│
                │  - 7-Day Recommendation    │            │  - coach_messages          │
                │  - Report Exporter         │            │  - user_coach_assignments  │
                └────────────────────────────┘            └────────────────────────────┘
```

---

## ⚙️ Core Modules & Features

### 1. User Authentication & Role-Based Access Control (RBAC)
- Secure user registration and login with bcrypt password hashing and JWT token authentication.
- **3 System Roles**:
  - **User**: Manage alarms, solve challenges, view personal habit scores, productivity insights, and message coach.
  - **Wellness Coach**: Monitor assigned client metrics, analyze habit trends, and send personalized guidance.
  - **Administrator**: System-wide platform metrics, user management, and service health monitoring.

### 2. Alarm Scheduling System
- **Supported Alarm Types**: Daily, Weekday, Weekend, One-Time, and Smart Adaptive Alarms.
- **Customizable Options**: Custom alarm title, trigger time, repeat schedule, challenge theme, difficulty level, sound selection, and snooze duration limit.

### 3. Cognitive Challenge Engine
- **Challenge Types**: Math Exercises, Logic Puzzles, Memory Match, Word Games, Pattern Recognition, and Riddles.
- **Difficulty Tiers**: Beginner, Easy, Medium, Hard, Expert.
- **Real-Time Verification**: Timer tracking, correct answer verification, wakefulness rating collection (1★–5★), and anti-snooze enforcement.

### 4. PostgreSQL Weighted Scoring Model
CogniWell calculates a daily **Habit Score** stored in PostgreSQL table `"Weighted Scoring Model"`:

$$\text{Habit Score} = (\text{Wake-Up Consistency} \times 35\%) + (\text{Challenge Completion Success} \times 25\%) + (\text{Snooze Reduction} \times 20\%) + (\text{Sleep Schedule Adherence} \times 20\%)$$

- **Storage Unit**: 1 Row Per Day Per User (`UNIQUE(user_id, score_date)`).
- **Trigger**: Automatically recalculated upon every alarm dismissal.

### 5. Recommendation Engine (7-Day Weekly Analysis)
- Analyzes the user's past 7 days of Weighted Scoring Model records and alarm sessions to trigger personalized recommendations:
  - **Low Wake-Up Consistency (<80%)**: *Circadian Wake Anchor Protocol*
  - **High Wake-Up Consistency (≥80%)**: *Peak Focus Window Allocation (09:00 AM – 11:30 AM)*
  - **Low Snooze Resistance (<80% / snoozes ≥2)**: *Snooze Elimination & Barrier Protocol*
  - **High Snooze Resistance (≥80%)**: *Early Sunlight & Neural Hydration Protocol*
  - **Low Challenge Solve Rate (<80%)**: *Adaptive Cognitive Challenge Calibration*
  - **High Challenge Solve Rate (≥80%)**: *Progressive Challenge Tier Optimization*
- **Interactive Notifications**:
  - Notification Bell (🔔) displays unread Coach Messages and Active Recommendations.
  - Clicking a recommendation navigates directly to **Active Productivity Recommendations** in Productivity Insights.
  - Clicking a message navigates directly to **Message History** in Wellness Coach Communication.

### 6. Dashboards & Behavioral Analytics
- **User Dashboard**: Overview of wake-up statistics, active alarms, recent session logs, streak counter, and report export.
- **Habit Score Analytics (`/user/habit-score`)**: Interactive chronological SVG trend graph and 30-day PostgreSQL data table.
- **Challenge Performance (`/user/challenge-performance`)**: Solve accuracy, average solve latency, theme performance breakdown.
- **Productivity Insights (`/user/productivity-insights`)**: Composite Productivity Index, execution speed improvement, circadian correlation, and 3 active weekly AI recommendations.

### 7. Wellness Coach Communication
- Direct bidirectional messaging between Users and assigned Wellness Coaches.
- Real-time unread badge indicators and direct navigation from notifications.

### 8. Executive Reports & Export System
- **One-Click Download Report** (Weekly / Monthly / Yearly):
  - **Executive Summary of Metrics**: Habit Score breakdown (Wake-Up 35%, Challenge 25%, Snooze 20%, Sleep 20%).
  - **Challenge Performance**: Overall solve accuracy, average solve time, streak length, snooze counts.
  - **Productivity Insights**: Composite productivity score, improvement rate, circadian correlation, active weekly recommendations.
  - **Detailed Session Logs**: Itemized table of dates, alarm titles, questions, user answers, solve status, time taken, and wakefulness ratings.

---

## 🛠️ Tech Stack

| Layer | Technologies Used |
|---|---|
| **Frontend** | React 19, Vite 8, React Router DOM 7, CSS3, HTML5 |
| **Backend** | Node.js, Express 5, REST API |
| **Database** | PostgreSQL 16+ (`pg` connection pool) |
| **Authentication** | JSON Web Tokens (JWT), `bcryptjs` |
| **Data Export** | Dynamic CSV / Report Generation Engine |
| **Deployment** | Vercel (Frontend), Render / Railway (Backend), Neon / Supabase (Cloud PostgreSQL) |

---

## 📁 Project Structure

```
dashboard/
├── src/
│   ├── assets/
│   ├── config/
│   │   └── api.js                 # API base URL & Auth Header configuration
│   ├── context/
│   │   ├── AlarmContext.jsx       # Global alarm triggering & audio handling
│   │   └── AuthContext.jsx        # Authentication state & JWT handling
│   ├── pages/
│   │   ├── AdminDashboard.jsx     # Administrator portal
│   │   ├── ChallengePerformancePage.jsx # Challenge analytics
│   │   ├── CoachDashboard.jsx     # Wellness Coach portal
│   │   ├── HabitScorePage.jsx     # Habit Score trend graph & PostgreSQL table
│   │   ├── LandingPage.jsx        # Platform homepage
│   │   ├── LoginPage.jsx          # Role-based login
│   │   ├── ProductivityInsightsPage.jsx # Productivity scores & weekly recommendations
│   │   ├── UserDashboard.jsx      # Main user dashboard & report exporter
│   │   └── UserDashboard.css      # Core dashboard styles
│   ├── App.jsx                    # Client route definitions
│   └── main.jsx                   # Application entry point
├── server/
│   └── server.js                  # Express API server, PostgreSQL queries, & WSM engine
├── package.json                   # Project dependencies and npm scripts
├── vercel.json                    # Vercel deployment & SPA routing config
└── vite.config.js                 # Vite build setup
```

---

## 🚀 Installation & Local Setup

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **PostgreSQL**: v14.0 or higher running locally or on cloud

### 1. Clone the Repository
```bash
git clone https://github.com/your-org/cogniwell.git
cd cogniwell/dashboard
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Create a `.env` file inside `dashboard/`:
```env
PORT=5001
JWT_SECRET=cogniwell_jwt_secret_key_2026

# PostgreSQL Database Configuration
PGUSER=postgres
PGPASSWORD=your_password
PGHOST=localhost
PGPORT=5432
PGDATABASE=cogniwell_db

# Or full connection URI:
# DATABASE_URL=postgresql://postgres:your_password@localhost:5432/cogniwell_db
```

### 4. Create Database
Ensure PostgreSQL is running, then create the database:
```sql
CREATE DATABASE cogniwell_db;
```
*(The backend automatically creates all required tables including `"Weighted Scoring Model"`, `alarms`, `alarm_sessions`, `users`, and `coach_messages` on server start.)*

### 5. Start Backend Server
```bash
npm run server
```
*Backend runs on `http://localhost:5001`*

### 6. Start Frontend Application
In a separate terminal window:
```bash
npm run dev
```
*Frontend runs on `http://localhost:5173`*

---

## 📡 API Documentation

### Authentication APIs
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Register a new user account |
| `POST` | `/api/auth/login` | Login user & receive JWT token |
| `GET` | `/api/auth/me` | Fetch authenticated user profile |

### Alarm Management APIs
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/alarms` | List user's scheduled alarms |
| `POST` | `/api/alarms` | Create a new cognitive alarm |
| `PUT` | `/api/alarms/:id` | Update an existing alarm |
| `DELETE` | `/api/alarms/:id` | Delete an alarm |
| `PATCH` | `/api/alarms/:id/enable` | Enable alarm |
| `PATCH` | `/api/alarms/:id/disable` | Disable alarm |

### Alarm Sessions & Verification
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/alarm-sessions/trigger` | Trigger active alarm session |
| `POST` | `/api/alarm-sessions/complete` | Validate challenge answer & log dismissal |

### Weighted Scoring Model & Recommendations
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/user/weighted-scoring-model` | Fetch 30-day Habit Score history from PostgreSQL |
| `POST` | `/api/user/weighted-scoring-model/sync` | Recalculate today's score & upsert row |
| `GET` | `/api/user/recommendations` | Fetch dynamic recommendations based on 7-Day Weekly Analysis |

---

## 🌐 Deployment Guide (Vercel & Cloud)

### Frontend Deployment (Vercel)
1. Import the repository on [Vercel](https://vercel.com).
2. Set **Root Directory** to `dashboard`.
3. Set Environment Variable:
   - `VITE_API_URL` = `https://your-backend-server.com`
4. Deploy! The included `vercel.json` ensures zero SPA routing errors.

### Backend & Database Deployment
- **Database**: Host PostgreSQL on [Neon.tech](https://neon.tech/) or [Supabase](https://supabase.com/).
- **Backend API**: Host `server/server.js` on [Render.com](https://render.com/) or [Railway.app](https://railway.app/) with environment variables set (`DATABASE_URL`, `JWT_SECRET`).

---

## 📄 License
This project is developed as part of the **Intelligent Cognitive Alarm Platform** project. All rights reserved.
