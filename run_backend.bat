@echo off
setlocal
title SlothAI Local FastAPI Backend

echo ========================================================
echo SlothAI Local FastAPI Backend Startup (Windows)
echo "Work less. Automate more. Stay slow."
echo ========================================================

where python >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Python 3.11+ was not found in your PATH.
    echo Please install Python 3.11+ from https://www.python.org/downloads/ and check "Add Python to PATH".
    pause
    exit /b 1
)

cd /d "%~dp0backend"

if not exist ".venv" (
    echo [1/3] Creating Python virtual environment in backend\.venv ...
    python -m venv .venv
)

echo [2/3] Activating virtual environment and verifying dependencies ...
call .venv\Scripts\activate.bat
pip install --disable-pip-version-check -q -r requirements.txt

if not defined SLOTHAI_BACKEND_HOST set SLOTHAI_BACKEND_HOST=127.0.0.1
if not defined SLOTHAI_BACKEND_PORT set SLOTHAI_BACKEND_PORT=8000
if not defined SLOTHAI_OLLAMA_BASE_URL set SLOTHAI_OLLAMA_BASE_URL=http://127.0.0.1:11434
if not defined SLOTHAI_DEFAULT_MODEL set SLOTHAI_DEFAULT_MODEL=qwen3:4b

echo [3/3] Starting FastAPI on http://%SLOTHAI_BACKEND_HOST%:%SLOTHAI_BACKEND_PORT% ...
echo       Configured Ollama URL: %SLOTHAI_OLLAMA_BASE_URL%
echo       Default Model Suggestion: %SLOTHAI_DEFAULT_MODEL%
echo.
python -m uvicorn app.main:app --host %SLOTHAI_BACKEND_HOST% --port %SLOTHAI_BACKEND_PORT% --reload
pause
