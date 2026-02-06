@echo off
echo ========================================================
echo       EVOTECH SOLUTION - SYSTEM UPDATE TOOL
echo ========================================================
echo.
echo [Step 1/3] Stopping current system...
docker-compose down

echo.
echo [Step 2/3] Downloading latest updates from GitHub...
git pull
IF %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Could not download updates! Check your internet connection.
    pause
    exit
)

echo.
echo [Step 3/3] Rebuilding and Starting the System...
docker-compose up -d --build

echo.
echo ========================================================
echo       UPDATE SUCCESSFUL! SYSTEM IS RUNNING.
echo ========================================================
echo.
pause
