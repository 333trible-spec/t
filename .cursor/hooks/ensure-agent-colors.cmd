@echo off
rem Проверка/ремонт инъекции цветов агентов (синхронно, с логом).
setlocal
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0ensure-agent-colors.ps1"
exit /b 0
