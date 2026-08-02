# 🧠 AI Cognitive Alarm System

A secure **AI Cognitive Alarm System** developed using **HTML, CSS, JavaScript, Node.js, Express.js, PostgreSQL, JWT Authentication, and Google OAuth**.
This application demonstrates a complete authentication system with **Email/Password Login**, **Google OAuth Login**, **Role-Based Access Control**, and secure password storage using **bcrypt**.


# 📌 Project Overview
The AI Cognitive Alarm System is designed to provide secure authentication and role-based dashboard access.

Users can either:
- Login using Email & Password (JWT Authentication)
- Login using Google Account (Google OAuth)
After successful authentication, users are redirected to their respective dashboards based on their assigned roles.


# ✨ Features

## Authentication
- JWT Authentication
- Google OAuth Login
- Secure Password Hashing using bcrypt
- Protected Login API
- Session Management
- Secure Token Storage

## Role-Based Access
- User Dashboard
- Coach Dashboard
- Admin Dashboard

## Database
- PostgreSQL Integration
- User Information Storage
- Password Hashing
- Google User Registration
- Role Management

# 🛠 Technologies Used
## Frontend
- HTML5
- CSS3
- JavaScript

## Backend
- Node.js
- Express.js

## Database
- PostgreSQL

## Authentication
- JSON Web Token (JWT)
- Google OAuth 2.0
- Passport.js
- bcrypt

## Development Tools
- VS Code
- Postman
- pgAdmin 4
- Git
- GitHub
- Live Server

# 📁 Project Structure
AI Cognitive Alarm/
│
├── Frontend/
│   │
│   ├── css/
│   │   └── style.css
│   │
│   ├── js/
│   │   └── auth.js
│   │
│   ├── index.html
│   ├── login.html
│   ├── user.html
│   ├── coach.html
│   └── admin.html
│
├── Backend/
│   │
│   ├── config/
│   │   ├── db.js
│   │   └── passport.js
│   │
│   ├── controllers/
│   │   └── authController.js
│   │
│   ├── routes/
│   │   ├── auth.js
│   │   └── google.js
│   │
│   │
│   ├── scripts/
│   │   └── hashPasswords.js
│   │
│   ├── package.json
│   ├── package-lock.json
│   ├── server.js
│   └── .env (Not included in GitHub)
│
├── README.md


# 🔐 Authentication Flow

## 1. Email & Password Login (JWT)
1. User enters email and password.
2. Backend verifies the email in PostgreSQL.
3. Password is compared with the stored bcrypt hash.
4. If authentication is successful, a JWT token is generated.
5. The token is stored in the browser.
6. User is redirected to the appropriate dashboard based on their role.


## 2. Google OAuth Login
1. User clicks **Continue with Google**.
2. Google authenticates the user.
3. Passport.js retrieves the user's profile.
4. Backend checks whether the user already exists.
5. If the user is new, their information is stored in PostgreSQL.
6. A JWT token is generated.
7. User is redirected to the appropriate dashboard.


# 👥 User Roles

### 👤 User
- Login
- View User Dashboard
- Access personal alarm features

### 🧑‍🏫 Coach
- Login
- View Coach Dashboard
- Monitor assigned users


### 👨‍💼 Admin
- Login
- View Admin Dashboard
- Manage users and system access


# 🗄 Database
The application uses **PostgreSQL** to store user information.

Example fields:

- User ID
- Name
- Email
- Password Hash
- Role
- Authentication Provider
- Created Date

Passwords are never stored in plain text.
All passwords are securely hashed using **bcrypt**.


# 🚀 Installation

## 1. Clone the Repository
bash
git clone https://github.com/YOUR_USERNAME/AI-Cognitive-Alarm.git

## 2. Navigate to Backend
bash
cd Backend

## 3. Install Dependencies
bash
npm install

## 4. Configure Environment Variables
Create a `.env` file inside the Backend folder.

Example:
env
PORT=5000

DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=your_database

JWT_SECRET=your_secret_key

GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:5000/auth/google/callback



## 5. Start the Backend
bash
node server.js


Backend runs on:
http://localhost:5000


## 6. Start the Frontend
Open the **Frontend** folder using **Live Server** in VS Code.

Example:
http://127.0.0.1:5500/Frontend/login.html


# 🧪 Testing
### Local Login
- Enter a valid email and password.
- JWT token is generated.
- User is redirected based on their role.


### Google Login
- Click **Continue with Google**.
- Sign in with a Google account.
- User is redirected to the appropriate dashboard.


# 🔒 Security Features
- Passwords hashed using bcrypt
- JWT-based authentication
- Google OAuth 2.0 authentication
- Role-Based Access Control (RBAC)
- Environment variables for sensitive credentials
- PostgreSQL secure data storage


# 🔮 Future Enhancements
- AI-powered smart alarm scheduling
- Email notifications
- SMS reminders
- Password reset functionality
- User profile management
- Dashboard analytics
- Alarm history tracking
- Mobile application support

# 👨‍💻 Author
Ch Lakshmi Narasimha

Developed as part of the **Infosys Internship Authentication Module** using modern web technologies and secure authentication mechanisms.
