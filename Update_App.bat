@echo off
setlocal enabledelayedexpansion

TITLE EvoTech Solution - Update Tool

echo ========================================================
echo       EVOTECH SOLUTION - SYSTEM UPDATE TOOL
echo ========================================================
echo.

:: Check for Administrator privileges
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [WARNING] This script might need Administrator privileges.
    echo If it fails, please right-click and "Run as Administrator".
    echo.
)

:: Check if Docker is running
echo [Check] Verifying Docker is running...
docker info >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Docker is NOT running!
    echo Please start Docker Desktop and wait for it to initialize.
    echo.
    pause
    exit /b 1
)
echo [OK] Docker is running.
echo.

:: Check Git installation
echo [Check] Verifying Git is installed...
git --version >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Git is not installed or not in PATH!
    echo.
    pause
    exit /b 1
)
echo [OK] Git is ready.
echo.

echo [Step 1/3] Stopping current system...
docker-compose down
IF %ERRORLEVEL% NEQ 0 (
    echo [WARNING] Could not stop services cleanly. They might not be running.
    echo Continuing anyway...
)

echo.
echo [Step 2/3] Downloading latest updates from GitHub...
:: Use fetch and reset hard to force update to remote state
:: This avoids merge conflicts if local files were modified
git fetch origin main
IF %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Could not fetch updates! Check your internet connection.
    pause
    exit /b 1
)

git reset --hard origin/main
IF %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Could not reset to latest code!
    pause
    exit /b 1
)

echo.
echo [Step 3/3] Rebuilding and Starting the System...
docker-compose up -d --build
IF %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Failed to start containers!
    echo Check Docker logs for more details.
    pause
    exit /b 1
)

echo.
echo ========================================================
echo       UPDATE SUCCESSFUL! SYSTEM IS RUNNING.
echo ========================================================
echo.
pause