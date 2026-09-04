@echo off
start "Backend" cmd /k "cd /d %~dp0backend && venv\Scripts\activate && uvicorn app.main:app --reload"
start "Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"
timeout /t 6
start http://localhost:5173