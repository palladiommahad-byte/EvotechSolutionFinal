@echo off
echo ==========================================
echo      EvoTech Solution - Start Local
echo ==========================================

echo.
echo Starting Backend Server...
start "EvoTech Backend" cmd /k "cd backend && npm start"

echo.
echo Starting Frontend Development Server...
start "EvoTech Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo Waiting for servers to initialize...
timeout /t 5 >nul

echo.
echo Opening Application in Browser...
start http://localhost:5173

echo.
echo Application started!
echo Close the popup windows to stop the servers.
pause
