@echo off
setlocal
title SlothAI Frontend Workspace

echo ========================================================
echo SlothAI Frontend Startup (Windows)
echo "Work less. Automate more. Stay slow."
echo ========================================================

where npm >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js / npm was not found in your PATH.
    echo Please install Node.js LTS from https://nodejs.org/
    pause
    exit /b 1
)

cd /d "%~dp0"

if not exist "node_modules" (
    echo [1/2] Installing frontend dependencies via npm install ...
    call npm install
)

if not defined VITE_BACKEND_URL set VITE_BACKEND_URL=http://127.0.0.1:8000

echo [2/2] Starting SlothAI Frontend on http://localhost:3000 ...
echo       Connected Backend URL: %VITE_BACKEND_URL%
echo.
call npm run dev
pause
