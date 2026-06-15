@echo off
title TAVO - Desarrollo
echo Levantando TAVO en modo DESARROLLO...
echo   Backend : http://localhost:4000
echo   Frontend: http://localhost:5173  (abrir esta en el navegador)
echo.
start "TAVO Backend" cmd /k "cd /d %~dp0server && npm run dev"
start "TAVO Frontend" cmd /k "cd /d %~dp0client && npm run dev"
timeout /t 4 >nul
start http://localhost:5173
