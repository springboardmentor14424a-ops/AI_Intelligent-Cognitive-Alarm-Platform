# Intelligent Cognitive Alarm Platform — Module 1
### User Authentication & Role-Based Access Control

This is Module 1 of the internship project: registration, login, JWT auth, Google OAuth2,
role-based access control (RBAC), and one dashboard each for **User**, **Wellness Coach**,
and **Admin**, backed by a PostgreSQL database.

```
cognitive-alarm-platform/
├── backend/     FastAPI + PostgreSQL + JWT + OAuth2
└── frontend/    React (Vite) + role-based dashboards
```

---

## 1. PostgreSQL Setup

You said PostgreSQL is already installed, so:

1. Open **pgAdmin4** (or `psql` in a terminal).
2. Create a database, e.g. `cognitive_alarm_db`.
3. Note the username/password you used — you'll need this in Step 2.

Using `psql`:
```bash
psql -U postgres
CREATE DATABASE cognitive_alarm_db;
\q
```

You do **not** need to create the `users` table manually — the backend creates it
automatically on first run (see `Base.metadata.create_all` in `app/main.py`).

---

## 2. Backend Setup (FastAPI)

```bash
cd backend
python -m venv venv

# Activate it
source venv/bin/activate        # macOS/Linux
venv\Scripts\activate           # Windows

pip install -r requirements.txt
```

Create your real `.env` file from the example:
```bash
cp .env.example .env
```

Edit `.env` and fill in:
- `DATABASE_URL` — your actual Postgres username/password/db name, e.g.
  `postgresql://postgres:yourpassword@localhost:5432/cognitive_alarm_db`
- `JWT_SECRET_KEY` — any long random string (e.g. generate one with
  `python -c "import secrets; print(secrets.token_hex(32))"`)
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — see Step 4 below

Run the server:
```bash
uvicorn app.main:app --reload
```

Visit **http://localhost:8000/docs** — this gives you interactive Swagger docs
for every endpoint (register, login, dashboards). Test registration/login here
first before touching the frontend.

---

## 3. Frontend Setup (React + Vite)

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Visit **http://localhost:5173**. You should see the Login page.

---

## 4. Google OAuth2 Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/) → create a project.
2. **APIs & Services → OAuth consent screen** → set up as "External", add your email as a test user.
3. **APIs & Services → Credentials → Create Credentials → OAuth Client ID**
   - Application type: Web application
   - Authorized redirect URI: `http://localhost:8000/api/auth/google/callback`
4. Copy the generated Client ID / Client Secret into your backend `.env`.
5. Restart the backend. Click "Continue with Google" on the login page to test.

If you don't finish Google Cloud setup before Monday, that's fine — local
email/password registration and login already fully works and demonstrates
JWT + RBAC. Add Google OAuth as a follow-up commit.

---

## 5. How the pieces fit together

- **Register** (`POST /api/auth/register`) — hashes the password with bcrypt, stores
  the user with a role (`USER` / `WELLNESS_COACH` / `ADMIN`), returns a JWT.
- **Login** (`POST /api/auth/login`) — verifies the password, returns a JWT containing
  `{id, email, role}`.
- **JWT** — the frontend stores it in `localStorage` and sends it as
  `Authorization: Bearer <token>` on every request (see `frontend/src/api.js`).
- **RBAC** — each dashboard endpoint (`/api/dashboard/user`, `/wellness-coach`, `/admin`)
  is protected by `require_role(...)` in `backend/app/dependencies.py`. A `WELLNESS_COACH`
  token hitting `/api/dashboard/admin` gets a 403.
- **Frontend route protection** — `ProtectedRoute.jsx` reads the role out of the stored
  user object and redirects to `/unauthorized` if it doesn't match.
- **Google OAuth2** — the backend handles the full code exchange with Google, creates a
  local account on first login (`provider = GOOGLE`, no password), and redirects to the
  frontend with a JWT, same as local login from that point on.

> Note: the registration form currently lets you pick your own role — that's a shortcut
> so you can test all three dashboards without an admin. Flag this to your mentor;
> in a real system role assignment/promotion should be admin-only.

---

## 6. Pushing to GitHub

```bash
cd cognitive-alarm-platform
git init
git add .
git commit -m "Module 1: Auth, RBAC, PostgreSQL, and role-based dashboards"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo-name>.git
git push -u origin main
```

**Before you push**, double check `.env` is NOT staged (it's in `.gitignore`, but verify
with `git status` — never commit real credentials or your JWT secret).

---

## 7. Quick manual test checklist

- [ ] `POST /api/auth/register` with role `USER` → get token → `GET /api/dashboard/user` → 200
- [ ] Same token → `GET /api/dashboard/admin` → 403 (RBAC working)
- [ ] Register a second account with role `ADMIN` → its token → `/api/dashboard/admin` → 200
- [ ] Frontend: register as each of the 3 roles, confirm you land on the matching dashboard
- [ ] Frontend: try manually navigating a `USER` account to `/dashboard/admin` → redirected to `/unauthorized`
- [ ] Google login round-trip (if OAuth credentials are set up)
