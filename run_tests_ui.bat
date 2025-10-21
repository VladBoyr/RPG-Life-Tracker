@echo off
TITLE Run All Tests

set "BASE_PATH=%~dp0"
set "BACKEND_PATH=%BASE_PATH%"
set "FRONTEND_PATH=%BASE_PATH%rpg-life-frontend"

set "PYTHON_EXE=%BACKEND_PATH%\venv\Scripts\python.exe"
set "MANAGE_PY=%BACKEND_PATH%\manage.py"

echo Starting Django Tests...
%PYTHON_EXE% %MANAGE_PY% test

echo Starting Django backend in a new window...
start "Django Server" /D "%BACKEND_PATH%" cmd /K "call .\venv\Scripts\activate.bat && echo Backend environment activated. Starting server... && pip install -r requirements.txt && python manage.py runserver"

echo Starting React frontend in a new window...
start "React Frontend" /D "%FRONTEND_PATH%" cmd /K "echo Installing/updating dependencies... && npm install && echo Starting Vite dev server... && npm run dev"

echo.
echo Both servers are starting in separate windows.

echo Waiting for Vite dev server to be ready...
timeout /t 5 /nobreak >nul

echo Starting End-to-End Tests...
start "Playwright Tests" /D "%FRONTEND_PATH%" cmd /K "npx playwright test --ui"

pause
