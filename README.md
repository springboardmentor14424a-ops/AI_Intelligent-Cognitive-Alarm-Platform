# BrainOS — Intelligent Cognitive Alarm Platform

BrainOS is a React + FastAPI cognitive alarm experience with a custom neural command-center UI, email/password JWT authentication, Google OAuth, and PostgreSQL storage.

## Run the frontend

```powershell
npm install
npm run dev
```

The interface runs at `http://localhost:5173`.

## Configure PostgreSQL and the API

1. In pgAdmin, create a database named `brainos`.
2. Open a terminal in `backend`, create a virtual environment, and install the API packages:

```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
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
