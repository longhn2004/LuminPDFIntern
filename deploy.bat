@echo off
REM LuminPDF Deployment Script for Windows
REM Usage: deploy.bat [local|production|stop|logs|test|migrate|cleanup|help]

setlocal enabledelayedexpansion

REM Check if command is provided
if "%1"=="" (
    echo [ERROR] No command specified
    goto :show_help
)

REM Check for .env file
if not exist ".env" (
    echo [WARNING] .env file not found. Creating from backend\.example.env...
    if exist "backend\.example.env" (
        copy "backend\.example.env" ".env" >nul
        echo [WARNING] Please update .env with your configuration
    ) else (
        echo [ERROR] No .example.env found. Please create .env file manually.
        exit /b 1
    )
)

REM Main command logic
if "%1"=="local" goto :deploy_local
if "%1"=="production" goto :deploy_production
if "%1"=="stop" goto :stop_services
if "%1"=="logs" goto :show_logs
if "%1"=="test" goto :test_deployment
if "%1"=="migrate" goto :migrate_mongodb
if "%1"=="cleanup" goto :cleanup
if "%1"=="help" goto :show_help
if "%1"=="--help" goto :show_help
if "%1"=="-h" goto :show_help

echo [ERROR] Unknown command: %1
goto :show_help

:deploy_local
echo [INFO] Starting local deployment with Docker Compose...
docker-compose down --remove-orphans
docker-compose build --no-cache
docker-compose up -d

echo [SUCCESS] Local deployment started!
echo [INFO] Services:
echo [INFO] - Frontend: http://localhost:3000
echo [INFO] - Backend: http://localhost:5000
echo [INFO] - Backend Health: http://localhost:5000/health
echo [INFO] - MongoDB: localhost:27017
echo [INFO] - Redis: localhost:6379
echo.
echo [INFO] To view logs: deploy.bat logs
echo [INFO] To stop services: deploy.bat stop
goto :end

:deploy_production
echo [INFO] Starting production deployment with Nginx proxy...
docker-compose --profile proxy down --remove-orphans
docker-compose --profile proxy build --no-cache
docker-compose --profile proxy up -d

echo [SUCCESS] Production deployment started!
echo [INFO] Services:
echo [INFO] - Application: http://localhost
echo [INFO] - Direct Frontend: http://localhost:3000
echo [INFO] - Direct Backend: http://localhost:5000
echo [INFO] - Health Check: http://localhost/health
goto :end

:stop_services
echo [INFO] Stopping all services...
docker-compose --profile proxy down --remove-orphans
docker-compose down --remove-orphans
echo [SUCCESS] All services stopped!
goto :end

:show_logs
if "%2"=="" (
    echo [INFO] Showing logs for all services...
    docker-compose logs -f
) else (
    echo [INFO] Showing logs for %2...
    docker-compose logs -f %2
)
goto :end

:test_deployment
echo [INFO] Testing deployment...
timeout /t 10 /nobreak >nul

REM Test backend health
curl -f http://localhost:5000/health >nul 2>&1
if %errorlevel%==0 (
    echo [SUCCESS] Backend health check passed
) else (
    echo [ERROR] Backend health check failed
    exit /b 1
)

REM Test frontend
curl -f http://localhost:3000 >nul 2>&1
if %errorlevel%==0 (
    echo [SUCCESS] Frontend check passed
) else (
    echo [ERROR] Frontend check failed
    exit /b 1
)

echo [SUCCESS] All tests passed!
goto :end

:migrate_mongodb
echo [INFO] Running MongoDB migration to Atlas...
cd backend
call npm run test:mongodb

if %errorlevel%==0 (
    echo [INFO] MongoDB Atlas connection test passed
    echo [INFO] Running migration dry run...
    call npm run migrate:mongodb:dry-run
    
    set /p proceed="Proceed with actual migration? (y/N): "
    if /i "!proceed!"=="y" (
        call npm run migrate:mongodb:backup
        echo [SUCCESS] MongoDB migration completed!
    ) else (
        echo [INFO] Migration cancelled
    )
) else (
    echo [ERROR] MongoDB Atlas connection failed. Please check configuration.
)
cd ..
goto :end

:cleanup
echo [INFO] Cleaning up Docker resources...
docker-compose down --remove-orphans --volumes
docker system prune -f
docker volume prune -f
echo [SUCCESS] Cleanup completed!
goto :end

:show_help
echo LuminPDF Deployment Script
echo =========================
echo.
echo Usage: %0 [command]
echo.
echo Commands:
echo   local       Start local development deployment
echo   production  Start production deployment with Nginx
echo   stop        Stop all services
echo   logs [service]  Show logs (optionally for specific service)
echo   test        Test deployment health
echo   migrate     Run MongoDB Atlas migration
echo   cleanup     Clean up Docker resources
echo   help        Show this help message
echo.
echo Examples:
echo   %0 local              # Start local deployment
echo   %0 logs backend       # Show backend logs
echo   %0 test               # Test deployment
echo   %0 migrate            # Migrate to MongoDB Atlas
goto :end

:end
endlocal 