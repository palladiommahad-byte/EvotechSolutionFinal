@echo off
echo ==========================================
echo      EvoTech Solution - Local Update
echo ==========================================

echo.
echo [1/3] Pulling latest changes from Git...
git pull
if %errorlevel% neq 0 (
    echo [ERROR] Git pull failed. Please check your internet connection or git status.
    pause
    exit /b %errorlevel%
)

echo.
echo [2/3] Updating Backend dependencies...
cd backend
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Backend npm install failed.
    pause
    exit /b %errorlevel%
)
cd ..

echo.
echo [3/3] Updating Frontend dependencies...
cd frontend
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Frontend npm install failed.
    pause
    exit /b %errorlevel%
)
cd ..

echo.
echoSources updated successfully!
echo You can now run 'start-local.bat' to start the application.
echo.
pause
