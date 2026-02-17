@echo off
setlocal EnableDelayedExpansion

echo ========================================================
echo       EVOTECH SOLUTION - SYSTEM UPDATE TOOL
echo ========================================================
echo.

:: Step 1: Check for Internet Connection (Simple Ping)
echo [Step 1/5] Checking internet connection...
ping -n 1 github.com >nul
if %errorlevel% neq 0 (
    echo [ERROR] No internet connection. Please check your network.
    pause
    exit /b
)

:: Step 2: Stop Containers
echo.
echo [Step 2/5] Stopping current system...
docker-compose down

:: Step 3: Git Update Logic
echo.
echo [Step 3/5] Checking for updates...
git fetch origin main

:: Attempt standard pull
git pull origin main
if %errorlevel% neq 0 (
    echo.
    echo [WARNING] Standard update failed. This is often due to local file changes.
    echo.
    choice /M "Do you want to FORCE the update? (This will discard all local changes)"
    if !errorlevel! equ 1 (
        echo.
        echo [INFO] Forcing update...
        git reset --hard origin/main
        git pull origin main
        
        if !errorlevel! neq 0 (
            echo.
            echo [FATAL ERROR] Force update failed. Please contact support.
            pause
            exit /b
        )
    ) else (
        echo.
        echo [INFO] Update cancelled by user.
        pause
        exit /b
    )
)

:: Step 4: Rebuild Containers
echo.
echo [Step 4/5] Rebuilding and Starting the System...
docker-compose up -d --build

:: Step 5: Clean up (Optional but good for disk space)
echo.
echo [Step 5/5] Cleaning up old resources...
docker image prune -f

echo.
echo ========================================================
echo       UPDATE SUCCESSFUL! SYSTEM IS RUNNING.
echo ========================================================
echo.
pause