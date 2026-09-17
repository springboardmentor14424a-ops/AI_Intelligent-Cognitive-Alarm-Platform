# BrainOS — Intelligent Cognitive Alarm Platform

BrainOS is a React + FastAPI cognitive alarm experience with a custom neural command-center UI, email/password JWT authentication, Google OAuth, and PostgreSQL storage.

## Run the frontend

```powershell
npm install
npm run dev
```

The interface runs at `http://localhost:5173`.

### Deploy the frontend to Vercel

Import the repository into Vercel with the Vite preset. The repository includes
`vercel.json`, so Vercel uses `npm run build` and publishes `dist` with SPA
fallback routing. Add this project environment variable:

```text
VITE_API_URL=https://your-production-api.example.com
```

The FastAPI service and PostgreSQL database must be deployed separately. Set
the backend `FRONTEND_URL` to the Vercel URL and update the Google OAuth
redirect URI to:

```text
https://your-production-api.example.com/oauth/google/callback
```

## Configure PostgreSQL and the API

1. In pgAdmin, create a database named `brainos`.
2. Open a terminal in `backend`, create a virtual environment, and install the API packages:

```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.local.example .env
```

3. Update `DATABASE_URL` and `JWT_SECRET` in `backend/.env`. The API creates the `users` and `alarms` tables automatically on startup. `database.sql` is included if you prefer creating them manually in pgAdmin.
4. Start the API:

```powershell
uvicorn main:app --reload
```

The API runs at `http://localhost:8000`; Swagger documentation is available at `/docs`.

## Google OAuth

Create a **Web application** OAuth client in Google Cloud Console and add this authorized redirect URI:

```text
http://localhost:8000/oauth/google/callback
```

Copy the generated client ID and client secret into `backend/.env`. The login page then uses `/oauth/google`; after Google verifies the user, BrainOS creates or reuses the PostgreSQL user and returns a JWT session.

## Authentication endpoints

- `POST /register` — create local user, returns JWT
- `POST /login` — local JWT login
- `GET /oauth/google` — begin Google OAuth
- `GET /profile` — protected profile
- `POST /alarm`, `GET /alarms` — protected alarm operations

Set `VITE_API_URL` in a frontend `.env` file if the API is not running at `http://localhost:8000`.

## Password recovery

Password reset uses a six-digit, single-use email OTP. Configure `SMTP_HOST`,
`SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `SMTP_FROM`, and `SMTP_USE_TLS`
in `backend/.env`. Codes expire after ten minutes, are limited to five failed
attempts, and can only be resent after the cooldown. Recovery is intentionally
disabled when SMTP is not configured; the application never claims that an
email was sent in that state.

## Module 3 — Alarm Scheduling

Alarm APIs are JWT-protected and support multiple alarms, `DAILY`, `WEEKDAY`, `WEEKEND`, `ONE_TIME`, and `SMART_ADAPTIVE` types. Each alarm has a label, sound, vibration option, snooze duration, mission difficulty, and active/disabled status.

- `POST /alarms`, `GET /alarms`, `GET /alarms/{id}`
- `PUT /alarms/{id}`, `DELETE /alarms/{id}`
- `PATCH /alarms/{id}/enable`, `PATCH /alarms/{id}/disable`
- `GET /alarms/today`, `GET /alarms/upcoming`, `POST /alarms/check-next`

APScheduler checks active alarms every minute. For development it logs a fired alarm; connect that hook to FCM or a mobile local-notification service when deploying a client app. Run scheduling tests with `pytest backend/tests` (after installing `pytest`). Import `backend/postman/brainos-alarms.postman_collection.json` into Postman for API checks.

For Dockerized frontend + API + PostgreSQL, run:

```powershell
docker compose up --build
```

The React production bundle is served by Nginx at `http://localhost:5173`,
the API is available at `http://localhost:8000`, and PostgreSQL is persisted in
the `postgres_data` volume. Set `VITE_API_URL` when the browser must reach the
API at a non-local address.

## Production deployment

The repo already contains everything needed to deploy for real — `Dockerfile` /
`backend/Dockerfile` for the two services, `docker-compose.yml` to run them
together, and `vercel.json` for the frontend. What's missing is the actual
hosting account and the environment variables only you can provide, so this
section is the checklist for wiring those up.

### 1. Backend + PostgreSQL

Any host that can run a Dockerfile and a managed Postgres instance works. Render
and Railway are the least setup for this project size (both offer a free/cheap
Postgres tier and build straight from `backend/Dockerfile`).

**Option A — Render Blueprint (fastest):** the repo includes `render.yaml` at
the root, which provisions both the Postgres database and the API web service
in one step.

1. Push this repo to GitHub if it isn't already there.
2. In the Render dashboard: **New +** → **Blueprint** → connect this repo.
   Render reads `render.yaml` and creates the `brainos-db` database and
   `brainos-api` web service.
3. Once `brainos-db` is up, open it and copy its **External Database URL**
   (looks like `postgres://user:pass@host/dbname`). Change the scheme to
   `postgresql+psycopg://` and paste the result into `brainos-api`'s
   `DATABASE_URL` environment variable — this one field can't be wired
   automatically because Render's default URL scheme maps to a driver
   (`psycopg2`) this project doesn't install.
4. Fill in the other `sync: false` variables the blueprint left blank:
   `FRONTEND_URL`, `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`,
   `GEMINI_API_KEY`, `ADMIN_BOOTSTRAP_EMAILS`, and the `SMTP_*` vars if you
   want password recovery email to work. `JWT_SECRET` is generated for you.
5. Save — Render redeploys automatically. Render's free Postgres tier expires
   after 30 days unless upgraded to a paid plan; fine for testing a deploy,
   not for something you intend to keep running.

**Option B — manual setup** (Render, Railway, or anything else without
blueprint support):

1. Create a new PostgreSQL instance on the host. Copy the connection string it
   gives you and rewrite it to use the `psycopg` driver, e.g.
   `postgresql+psycopg://user:pass@host:5432/dbname`.
2. Create a new Web Service pointed at this repo with **root directory**
   `backend` (so it picks up `backend/Dockerfile`), or point it at the repo
   root and set the Dockerfile path to `backend/Dockerfile` if the host asks.
3. Set these environment variables on the service (see
   `backend/.env.local.example` for the full list and description of each):
   `DATABASE_URL`, `JWT_SECRET` (a long random value, not the dev default),
   `FRONTEND_URL` (your Vercel URL), `GOOGLE_CLIENT_ID` /
   `GOOGLE_CLIENT_SECRET`, `GEMINI_API_KEY`, `USE_GEMINI_CHALLENGES`,
   `ADMIN_BOOTSTRAP_EMAILS`, and the `SMTP_*` variables if you want password
   recovery to actually send email.
4. Deploy. The API creates its tables automatically on startup; no manual
   migration step is required for a first deploy.

Either way, confirm `https://your-api-host/health` returns
`{"status": "neural core online"}` before moving on.

### 2. Frontend (Vercel)

Already covered above under **Deploy the frontend to Vercel** — set
`VITE_API_URL` to the backend host from step 1.

### 3. Wire the two together

- Update the backend's `FRONTEND_URL` to the real Vercel URL (CORS in
  `backend/main.py` only allows `FRONTEND_URL` plus localhost, so this step is
  not optional — requests from the deployed frontend will be rejected until
  it's set).
- Update the Google OAuth Console redirect URI to
  `https://your-api-host/oauth/google/callback`.
- If you serve the API over HTTPS (any real host does), also flip
  `https_only=False` to `True` on the `SessionMiddleware` in
  `backend/main.py` — it's currently hardcoded for local HTTP development and
  should not ship to production as-is.

### 4. Alternative: self-host everything with Docker Compose

If you'd rather run on a single VPS instead of Render/Vercel, `docker compose
up --build` (documented above) already runs all three services together. In
that case put the same environment variables in a `.env` file next to
`docker-compose.yml`, put a reverse proxy (e.g. Caddy or nginx) in front for
TLS, and point its DNS at the box.

### 5. CI/CD

`.github/workflows/ci.yml` already runs backend tests, frontend lint/tests,
and a frontend build on every push — that's continuous **integration**.
There is no continuous **deployment** step (nothing auto-deploys on merge).
Render, Railway, and Vercel can all auto-deploy from a GitHub push once
connected, which covers this without extra workflow code; wire that up from
each host's dashboard once step 1/2 are done.

## Monitoring, logging, and performance

### Current state

- `docker-compose.yml` has container healthchecks for the database and API
  (`pg_isready` and a request to `/health`), which restarts a container that
  stops responding — that's the extent of what's wired up today.
- The backend has no structured logging: `backend/main.py` never imports
  `logging`, so errors and request activity are only visible via whatever the
  process's stdout happens to show.
- There's no error-tracking or metrics service connected, and no dashboard.

### Adding uptime monitoring (no code changes needed)

Point a free service like UptimeRobot or Better Stack at
`https://your-api-host/health` on an interval (e.g. every 5 minutes) and it
will alert you (email/SMS/Slack) if the backend stops responding. This is the
fastest win since the endpoint already exists.

### Adding error tracking (Sentry)

1. Create a free account at sentry.io and a new Python (FastAPI) project —
   it gives you a DSN string.
2. Add `sentry-sdk[fastapi]` to `backend/requirements.txt`.
3. In `backend/main.py`, before `app = FastAPI(...)`, add:
   ```python
   import sentry_sdk
   if os.getenv("SENTRY_DSN"):
       sentry_sdk.init(dsn=os.getenv("SENTRY_DSN"), traces_sample_rate=0.1)
   ```
4. Set `SENTRY_DSN` as an environment variable on the deployed backend only
   (leave it unset locally so dev errors don't get reported).

Say the word and I can make this exact change to `backend/main.py` and
`requirements.txt` — it just needs your DSN as an env var afterward.

### Performance notes

- The APScheduler job in `backend/alarm_service.py` / `main.py` polls active
  alarms on a fixed interval regardless of how many alarms exist; this is
  fine at current scale but is the first thing to revisit if the alarms table
  grows large.
- The frontend dashboard (`src/pages/Dashboard.jsx`) runs several
  `setInterval` timers (alarm ring-check, clock tick, alarm tone) — harmless
  for one open tab, but worth auditing if this ever needs to support many
  simultaneous connected clients hitting the API on the same intervals.
- No frontend route code-splitting yet — `Workspace`/`Analytics` load in the
  same bundle as the core dashboard. `React.lazy` + `Suspense` around those
  views would shrink the initial bundle if load time becomes a concern.

## Implemented modules

The repository currently includes authentication and RBAC, profile/habits,
multi-alarm scheduling, cognitive challenges with deterministic fallback,
adaptive difficulty, wake verification, behavioral analytics, weighted habit
scoring, evidence-linked recommendations, role-aware workspaces, in-app
notifications, PDF/XLSX reports, and Docker deployment scaffolding.

Native React Native clients, FCM delivery, and cloud-provider deployment
credentials are not part of this web repository; the API exposes the
notification and scheduling hooks required by a future mobile client.
