# FastAPI & PostgreSQL Authentication Backend

This directory contains the FastAPI backend and PostgreSQL database implementation created according to the specification screenshots.

---

## 📐 Architecture Overview

### 1. Database Schema (`users` table)
| Field | Type | Attributes | Description |
|-------|------|------------|-------------|
| `id` | INTEGER | PRIMARY KEY, AUTO-INCREMENT | User ID |
| `name` | VARCHAR(100) | NOT NULL | User Full Name |
| `email` | VARCHAR(255) | UNIQUE, INDEX, NOT NULL | Unique Email Address |
| `password` | VARCHAR(255) | NOT NULL | BCrypt Encrypted Password |
| `role` | VARCHAR(50) | NOT NULL, DEFAULT 'USER' | User Role (`USER`, `Wellness Coach`, `Administrator`) |
| `provider` | VARCHAR(50) | NOT NULL, DEFAULT 'LOCAL' | Auth Provider (`LOCAL` or `GOOGLE`) |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Record Creation Timestamp |
| `updated_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Record Update Timestamp |

---

## 🚀 Step 2: Registration API Specification

### Endpoint
`POST /api/auth/register`

### Request Body
```json
{
  "name": "John",
  "email": "john@gmail.com",
  "password": "Password@123",
  "role": "USER"
}
```

### Backend Process Executed
1. **Receive request**: Accepts payload via FastAPI JSON body parser.
2. **Validate data**: Validates schema and fields using Pydantic `UserRegister`.
3. **Check email already exists**: Queries PostgreSQL database for existing email. Returns `400 Bad Request` if email exists.
4. **Hash password using BCrypt**: Hashes plain text password with BCrypt salt before writing to database.
5. **Save into database**: Inserts new user record into PostgreSQL `users` table.
6. **Return success response**: Returns `201 Created` with serialized user data.

---

## 🛠️ How to Run locally

### Option A: With Local PostgreSQL Database
1. Make sure PostgreSQL is installed and running on your system.
2. Create database:
   ```sql
   CREATE DATABASE ai_alarm_db;
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Run database setup and seed default user:
   ```bash
   python init_db.py
   ```
5. Start FastAPI server:
   ```bash
   uvicorn main:app --reload --port 8000
   ```
6. Open Interactive API Documentation in browser:
   [http://localhost:8000/docs](http://localhost:8000/docs)

---

### Option B: With Docker (PostgreSQL Container)
1. Run containerized PostgreSQL:
   ```bash
   docker-compose up -d
   ```
2. Run database setup:
   ```bash
   python init_db.py
   ```
3. Start FastAPI server:
   ```bash
   uvicorn main:app --reload --port 8000
   ```
