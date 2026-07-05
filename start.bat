@echo off
title BITTX SMS - Starting...
echo.
echo  ╔══════════════════════════════════════╗
echo  ║      BITTX SMS - Starting App        ║
echo  ╚══════════════════════════════════════╝
echo.

REM Start Backend Server in new window
echo  [1/2] Starting Backend Server (port 5000)...
start "BITTX SMS - Backend" cmd /k "cd /d "%~dp0server" && node src/index.js"

REM Wait 2 seconds for server to start
timeout /t 2 /nobreak > nul

REM Start Frontend in new window
echo  [2/2] Starting Frontend (port 5173)...
start "BITTX SMS - Frontend" cmd /k "cd /d "%~dp0" && npm run dev"

echo.
echo  ╔══════════════════════════════════════╗
echo  ║  Both services started!              ║
echo  ║                                      ║
echo  ║  Frontend: http://localhost:5173     ║
echo  ║  Backend:  http://localhost:5000     ║
echo  ║  Admin:    http://localhost:5173/admin║
echo  ║                                      ║
echo  ║  Press any key to open in browser... ║
echo  ╚══════════════════════════════════════╝
echo.
pause > nul

REM Open browser
start http://localhost:5173/admin
