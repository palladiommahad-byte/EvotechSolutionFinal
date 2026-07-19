@echo off
setlocal EnableExtensions EnableDelayedExpansion
title EvoTech Solution - One-Click Installer

call :main
set "INSTALL_EXIT_CODE=%ERRORLEVEL%"
endlocal & exit /b %INSTALL_EXIT_CODE%

:main
cd /d "%~dp0"

echo.
echo ========================================================
echo       EVOTECH SOLUTION - ONE-CLICK INSTALLER
echo ========================================================
echo.

where docker >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker Desktop is not installed or Docker is not in PATH.
    echo Install Docker Desktop, restart Windows if requested, then run this file again.
    start "" "https://www.docker.com/products/docker-desktop/"
    pause
    exit /b 1
)

docker compose version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker Compose is unavailable.
    echo Update or reinstall Docker Desktop, then run this file again.
    pause
    exit /b 1
)

echo [1/4] Checking Docker Desktop...
docker info >nul 2>&1
if not errorlevel 1 goto docker_ready

set "DOCKER_DESKTOP=%ProgramFiles%\Docker\Docker\Docker Desktop.exe"
if not exist "%DOCKER_DESKTOP%" (
    echo [ERROR] Docker Desktop is not running.
    echo Start Docker Desktop, wait until it says Engine running, then run this file again.
    pause
    exit /b 1
)

echo Docker Desktop is not running. Starting it now...
start "" "%DOCKER_DESKTOP%"
call :wait_for_docker
if not errorlevel 1 goto docker_ready
echo [ERROR] Docker Desktop did not become ready within 2 minutes.
echo Open Docker Desktop and resolve any startup error, then run this file again.
pause
exit /b 1

:docker_ready
echo [OK] Docker Desktop is ready.
echo.
call :find_frontend_port
if errorlevel 1 (
    echo [ERROR] EvoTech could not find a free web port from 8080 to 8085.
    echo Close the application using one of those ports, then run this file again.
    pause
    exit /b 1
)
if not "%FRONTEND_PORT%"=="8080" (
    echo [INFO] Port 8080 is already in use. EvoTech will use port %FRONTEND_PORT% instead.
)

echo [2/4] Building EvoTech images and starting services...
call :start_services
if errorlevel 1 (
    echo.
    echo [ERROR] Docker could not build or start EvoTech Solution.
    echo.
    docker compose ps
    echo.
    echo Review the Docker output above, fix the reported issue, and run this file again.
    pause
    exit /b 1
)

echo.
echo [3/4] Waiting for PostgreSQL to accept connections...
call :wait_for_postgres
if errorlevel 1 goto service_failure
echo [OK] PostgreSQL is ready.

echo.
echo [4/4] Waiting for the EvoTech API to become available...
call :wait_for_api
if errorlevel 1 goto service_failure
echo [OK] EvoTech API is ready.

echo.
echo ========================================================
echo       INSTALLATION COMPLETE - EVOTECH IS RUNNING
echo ========================================================
echo.
echo Opened: http://localhost:%FRONTEND_PORT%
echo Your database and backups are kept when this installer is run again.
start "" "http://localhost:%FRONTEND_PORT%"
echo.
pause
exit /b 0

:service_failure
echo.
echo [ERROR] The containers started but did not become ready in time.
echo.
docker compose ps
echo.
echo Recent server logs:
docker compose logs --tail=80 server
echo.
pause
exit /b 1

:wait_for_postgres
set /a POSTGRES_WAITED=0
:postgres_retry
docker compose exec -T postgres pg_isready -U postgres -d EvotechSolution >nul 2>&1
if not errorlevel 1 exit /b 0
set /a POSTGRES_WAITED+=2
if !POSTGRES_WAITED! GEQ 120 exit /b 1
timeout /t 2 /nobreak >nul
goto postgres_retry

:wait_for_docker
set /a DOCKER_WAITED=0
:docker_retry
timeout /t 2 /nobreak >nul
docker info >nul 2>&1
if not errorlevel 1 exit /b 0
set /a DOCKER_WAITED+=2
if !DOCKER_WAITED! GEQ 120 exit /b 1
echo Waiting for Docker Desktop... !DOCKER_WAITED! seconds
goto docker_retry

:wait_for_api
set /a API_WAITED=0
:api_retry
powershell -NoProfile -ExecutionPolicy Bypass -Command "try { $response = Invoke-WebRequest -UseBasicParsing -TimeoutSec 3 http://localhost:3000/api/health; if ($response.StatusCode -eq 200) { exit 0 } } catch {}; exit 1" >nul 2>&1
if not errorlevel 1 exit /b 0
set /a API_WAITED+=2
if !API_WAITED! GEQ 150 exit /b 1
timeout /t 2 /nobreak >nul
goto api_retry

:find_frontend_port
for %%P in (8080 8081 8082 8083 8084 8085) do (
    powershell -NoProfile -ExecutionPolicy Bypass -Command "if (Get-NetTCPConnection -LocalPort %%P -State Listen -ErrorAction SilentlyContinue) { exit 1 }; exit 0" >nul 2>&1
    if not errorlevel 1 (
        set "FRONTEND_PORT=%%P"
        exit /b 0
    )
)
exit /b 1

:start_services
docker compose up -d --build
if not errorlevel 1 exit /b 0

echo [INFO] The initial startup failed. Trying a different web port automatically...
for %%P in (8081 8082 8083 8084 8085) do (
    if "%%P" NEQ "%FRONTEND_PORT%" (
        set "FRONTEND_PORT=%%P"
        echo Trying http://localhost:%%P ...
        docker compose up -d client
        if not errorlevel 1 exit /b 0
    )
)
exit /b 1
