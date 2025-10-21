@echo off
TITLE Make Migrations

set "BASE_PATH=%~dp0"
set "BACKEND_PATH=%BASE_PATH%"

set "PYTHON_EXE=%BACKEND_PATH%\venv\Scripts\python.exe"
set "MANAGE_PY=%BACKEND_PATH%\manage.py"

%PYTHON_EXE% %MANAGE_PY% makemigrations
%PYTHON_EXE% %MANAGE_PY% migrate

pause
