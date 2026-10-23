@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Please install Node.js 24 LTS, then open this file again.
  pause
  exit /b 1
)
if not exist node_modules (
  call npm install
  if errorlevel 1 (
    echo Installation did not finish. See README.md for setup help.
    pause
    exit /b 1
  )
)
echo Tony Baloney Studios - The Shadow Puppet Uprising
echo Keep this window open while you play. Ctrl+C stops the game server.
call npm run dev -- --open
pause
