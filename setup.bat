@echo off
title TAVO - Instalacion
echo ==============================================
echo   TAVO E-COMMERCE - INSTALACION
echo ==============================================
echo.

REM ---- 1. Verificar Node.js ----
where node >nul 2>nul
if errorlevel 1 goto no_node
echo [OK] Node.js detectado:
node -v
echo.

REM ---- 2. Verificar MySQL ----
where mysql >nul 2>nul
if errorlevel 1 goto no_mysql
echo [OK] MySQL detectado.
set /p IMPORTAR="Importar la base de datos ahora? (S/N): "
if /i not "%IMPORTAR%"=="S" goto env
echo Ingresa la password de root de MySQL cuando la pida:
mysql -u root -p < "%~dp0database\schema.sql"
if errorlevel 1 (
    echo [ERROR] Fallo la importacion. Podes hacerla manualmente con MySQL Workbench
    echo         abriendo el archivo database\schema.sql y ejecutandolo.
) else (
    echo [OK] Base de datos "tavo_ecommerce" creada con datos de ejemplo.
)
goto env

:no_mysql
echo [AVISO] No se encontro el comando "mysql" en el PATH.
echo Si MySQL esta instalado, podes importar la base manualmente
echo con MySQL Workbench abriendo: database\schema.sql
echo Si no esta instalado: https://dev.mysql.com/downloads/installer/
echo.

:env
REM ---- 3. Crear .env si no existe ----
if exist "%~dp0server\.env" (
    echo [OK] server\.env ya existe, no se toca.
) else (
    copy "%~dp0server\.env.example" "%~dp0server\.env" >nul
    echo [OK] Se creo server\.env desde la plantilla.
    echo.
    echo  *** IMPORTANTE ***
    echo  Abri server\.env con el Bloc de notas y completa:
    echo    - DB_PASSWORD     tu password de MySQL
    echo    - MP_ACCESS_TOKEN credencial de Mercado Pago
    echo    - JWT_SECRET      cualquier texto largo aleatorio
    echo.
)

REM ---- 4. Instalar dependencias ----
echo Instalando dependencias del BACKEND...
cd /d "%~dp0server"
call npm install
if errorlevel 1 goto err_server

echo.
echo Instalando dependencias del FRONTEND...
cd /d "%~dp0client"
call npm install
if errorlevel 1 goto err_client

cd /d "%~dp0"
echo.
echo ==============================================
echo   INSTALACION COMPLETA
echo ==============================================
echo   1. Completa server\.env (DB_PASSWORD y MP_ACCESS_TOKEN)
echo   2. Ejecuta start-dev.bat  (modo desarrollo)
echo      o start-produccion.bat (un solo puerto, para "servidor")
echo ==============================================
pause
exit /b 0

:no_node
echo [ERROR] Node.js no esta instalado.
echo Descargalo de https://nodejs.org (version LTS) e instalalo.
echo Despues volve a ejecutar este script.
pause
exit /b 1

:err_server
echo [ERROR] Fallo npm install en server
pause
exit /b 1

:err_client
echo [ERROR] Fallo npm install en client
pause
exit /b 1
