@echo off
setlocal

set "CONTAINER=evotech_db"
set "DB_USER=postgres"
set "DB_NAME=EvotechSolution"
set "BACKUP_DIR=%~dp0backups"
set "BACKUP_FILE=%~1"

echo ==========================================
echo      EvoTech Solution - Database Restore
echo ==========================================
echo.

if "%BACKUP_FILE%"=="" (
    echo Usage:
    echo   restore-database.bat "C:\path\to\evotech_backup.dump"
    echo.
    echo Backups in the default folder:
    if exist "%BACKUP_DIR%" dir /B /O-D "%BACKUP_DIR%\*.dump"
    echo.
    pause
    exit /b 1
)

if not exist "%BACKUP_FILE%" (
    echo ERROR: Backup file not found:
    echo %BACKUP_FILE%
    echo.
    pause
    exit /b 1
)

docker ps --format "{{.Names}}" | findstr /R /C:"^%CONTAINER%$" >nul
if errorlevel 1 (
    echo ERROR: Docker container "%CONTAINER%" is not running.
    echo Start only the database or the full app first with: docker compose up -d
    echo.
    pause
    exit /b 1
)

echo WARNING: This will replace the current database:
echo %DB_NAME%
echo.
echo Backup file:
echo %BACKUP_FILE%
echo.
set /p CONFIRM=Type RESTORE to continue: 
if /I not "%CONFIRM%"=="RESTORE" (
    echo Restore cancelled.
    pause
    exit /b 1
)

echo.
echo Stopping app containers so the database can be replaced...
docker stop evotech_server evotech_client >nul 2>nul

echo Copying backup into PostgreSQL container...
docker cp "%BACKUP_FILE%" %CONTAINER%:/tmp/evotech_restore.dump
if errorlevel 1 (
    echo ERROR: Could not copy backup into container.
    pause
    exit /b 1
)

echo Recreating database...
docker exec %CONTAINER% dropdb -U %DB_USER% --if-exists %DB_NAME%
if errorlevel 1 (
    echo ERROR: Could not drop database.
    pause
    exit /b 1
)

docker exec %CONTAINER% createdb -U %DB_USER% %DB_NAME%
if errorlevel 1 (
    echo ERROR: Could not create database.
    pause
    exit /b 1
)

echo Restoring backup...
docker exec %CONTAINER% pg_restore -U %DB_USER% -d %DB_NAME% /tmp/evotech_restore.dump
if errorlevel 1 (
    echo ERROR: Restore failed.
    pause
    exit /b 1
)

echo.
echo Restore completed successfully.
echo Start the app again with: docker compose up -d
echo.
pause
