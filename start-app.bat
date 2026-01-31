@echo off
echo Starting EvoTech Solution...
docker-compose up -d
echo Application started!
echo Opening browser...
timeout /t 5
start http://localhost
pause
