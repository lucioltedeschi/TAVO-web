@echo off
title TAVO - Produccion
echo ==============================================
echo  TAVO - MODO PRODUCCION (un solo proceso)
echo ==============================================
echo Compilando el frontend...
cd /d "%~dp0client"
call npm run build
if errorlevel 1 goto err

echo.
echo Levantando el servidor (sirve API + web en el mismo puerto)...
echo La web queda disponible en http://localhost:4000
echo (o en el puerto que hayas puesto en server\.env)
echo Para verla desde otras PCs de la red: http://IP-DE-ESTA-PC:4000
echo Cerra esta ventana para apagar el servidor.
echo.
cd /d "%~dp0server"
npm start
pause
exit /b 0

:err
echo [ERROR] Fallo el build del frontend
pause
exit /b 1
