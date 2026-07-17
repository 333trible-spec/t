@echo off
rem Быстрая проверка инъекции цветов агентов (~30-60 мс).
rem Ремонт (PowerShell) запускается отдельным процессом и не блокирует старт сессии.
setlocal
set "WB=%LOCALAPPDATA%\Programs\cursor\resources\app\out\vs\code\electron-sandbox\workbench\workbench.html"
if not exist "%WB%" set "WB=%LOCALAPPDATA%\cursor\resources\app\out\vs\code\electron-sandbox\workbench\workbench.html"
if not exist "%WB%" exit /b 0
findstr /m /c:"VSCODE-CUSTOM-CSS-START" "%WB%" >nul 2>&1 && exit /b 0
start "" /min powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "%~dp0ensure-agent-colors.ps1"
exit /b 0
