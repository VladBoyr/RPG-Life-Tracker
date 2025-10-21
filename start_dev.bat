@echo off
TITLE Development Launcher

set "BASE_PATH=%~dp0"
set "BACKEND_PATH=%BASE_PATH%"
set "FRONTEND_PATH=%BASE_PATH%rpg-life-frontend"

echo Starting Django backend in a new window...
start "Django Server" /D "%BACKEND_PATH%" cmd /K "call .\venv\Scripts\activate.bat && echo Backend environment activated. Starting server... && pip install -r requirements.txt && python manage.py runserver"

echo Starting React frontend in a new window...
start "React Frontend" /D "%FRONTEND_PATH%" cmd /K "echo Installing/updating dependencies... && npm install && npm audit fix && echo Starting Vite dev server... && npm run dev"

echo.
echo Both servers are starting in separate windows.

echo Waiting for Vite dev server to be ready...
timeout /t 5 /nobreak >nul

echo Opening browser at http://localhost:5173
start http://localhost:5173

echo.
echo This launcher window can now be closed.
