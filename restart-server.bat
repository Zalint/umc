@echo off
:: Restart Server Script (Batch file version)
:: Double-click this file to restart the server

echo ==============================================
echo   Gambia Election Results Server - Restart
echo ==============================================
echo.

:: Stop any running Node.js processes
echo Stopping existing Node.js processes...
taskkill /F /IM node.exe >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Stopped running servers
) else (
    echo [OK] No servers running
)
timeout /t 2 /nobreak >nul
echo.

:: Start the server
echo Starting server...
echo Press Ctrl+C to stop the server
echo.

npm start

pause

