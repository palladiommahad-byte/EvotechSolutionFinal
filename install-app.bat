@echo off
echo Starting Evotech Solution Deployment...

:: Clean up old instances
echo Cleaning up old Docker instances...
docker-compose down

:: Build and run in detached mode
echo Building and starting services...
docker-compose up -d --build

:: Wait for database to initialize
echo Waiting for database initialization (10 seconds)...
timeout /t 10

:: Open browser
echo Opening application...
start http://192.168.100.241:8080

echo Deployment complete!
pause
