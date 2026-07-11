@echo off
setlocal

set "CONTAINER=evotech_db"
set "DB_USER=postgres"
set "DB_NAME=EvotechSolution"
set "BACKUP_DIR=%~dp0backups"

if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

for /f %%i in ('powershell -NoProfile -Command "Get-Date -Format yyyy-MM-dd_HH-mm-ss"') do set "TS=%%i"
set "BACKUP_FILE=%BACKUP_DIR%\evotech_%TS%.dump"

echo ==========================================
echo      EvoTech Solution - Database Backup
echo ==========================================
echo.
echo Backup folder:
echo %BACKUP_DIR%
echo.

docker ps --format "{{.Names}}" | findstr /R /C:"^%CONTAINER%$" >nul
if errorlevel 1 (
    echo ERROR: Docker container "%CONTAINER%" is not running.
    echo Start the app first with: docker compose up -d
    echo.
    pause
    exit /b 1
)

echo Creating backup:
echo %BACKUP_FILE%
echo.

docker exec %CONTAINER% pg_dump -U %DB_USER% -d %DB_NAME% -Fc > "%BACKUP_FILE%"
if errorlevel 1 (
    echo.
    echo ERROR: Backup failed.
    if exist "%BACKUP_FILE%" del "%BACKUP_FILE%"
    pause
    exit /b 1
)

certutil -hashfile "%BACKUP_FILE%" SHA256 > "%BACKUP_FILE%.sha256"

echo.
echo Backup created successfully.
echo Keep a copy outside this computer too, for example USB drive, NAS, or cloud storage.
echo.
pause
