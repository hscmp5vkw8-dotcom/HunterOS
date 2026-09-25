@echo off
setlocal
cd /d "%~dp0"
if exist "C:\Program Files\nodejs\node.exe" set "PATH=C:\Program Files\nodejs;%PATH%"
where node >nul 2>nul
if errorlevel 1 (
  echo Install Node.js LTS from https://nodejs.org first, then reopen this file.
  pause
  exit /b 1
)
if not exist "node_modules\expo\bin\cli" (
  echo HunterOS mobile - installing project dependencies.
  call npm ci
  if errorlevel 1 goto failed
)
echo Sign into the same Expo account you use in Expo Go on your iPhone when prompted.
call npx expo login --browser
if errorlevel 1 goto failed
echo Keep this window open. Use the iPhone Camera to scan the QR code.
call npx expo start --go
if errorlevel 1 goto failed
exit /b 0
:failed
echo Setup could not finish. Keep this error message and share it for troubleshooting.
pause
exit /b 1
