@echo off
setlocal

set "CONTAINER=evotech_db"
set "DB_USER=postgres"
set "DB_NAME=EvotechSolution"
set "BACKUP_DIR=%~dp0backups"

cd /d "%~dp0"

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

docker info >nul 2>nul
if errorlevel 1 (
    echo ERROR: Docker is not running.
    echo Please open Docker Desktop, wait until it is ready, then run this backup again.
    echo.
    pause
    exit /b 1
)

docker inspect %CONTAINER% >nul 2>nul
if errorlevel 1 (
    echo PostgreSQL container was not found. Starting it now...
    docker compose up -d postgres
) else (
    docker inspect -f "{{.State.Running}}" %CONTAINER% | findstr /I "true" >nul
    if errorlevel 1 (
        echo PostgreSQL container is stopped. Starting it now...
        docker start %CONTAINER% >nul
    )
)

echo Waiting for PostgreSQL to be ready...
set "READY="
for /L %%i in (1,1,30) do (
    docker exec %CONTAINER% pg_isready -U %DB_USER% -d %DB_NAME% >nul 2>nul
    if not errorlevel 1 (
        set "READY=1"
        goto db_ready
    )
    timeout /t 2 >nul
)

:db_ready
if not defined READY (
    echo.
    echo ERROR: PostgreSQL did not become ready.
    echo Try opening Docker Desktop and run: docker compose up -d
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
