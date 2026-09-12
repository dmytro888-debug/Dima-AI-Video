@echo off
setlocal
cd /d "%~dp0"
if not exist "node_modules\express" (
  echo Installing Dima AI Studio dependencies...
  call npm install
  if errorlevel 1 goto :error
)

echo Starting Dima AI Studio self-hosted...
call npm start
goto :eof

:error
echo.
echo INSTALL ERROR. Перевір Node.js 20+ та повтори.
pause
