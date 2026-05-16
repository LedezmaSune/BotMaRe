@echo off
setlocal enabledelayedexpansion
title BotMaRe - Unificado Control Panel
color 0a

:: Configurar esta carpeta como segura en Git para evitar errores de "dubious ownership"
git config --global --add safe.directory "%cd:\=/%" >nul 2>&1

:MENU
cls
:: --- AUTODIAGNOSTICO ---
set "MISSING_ENV="
if not exist ".env" set "MISSING_ENV=1"

set "MISSING_DEPS="
if not exist "node_modules" set "MISSING_DEPS=1"

set "MISSING_OUT="
if not exist "out\index.html" set "MISSING_OUT=1"

echo ========================================================
echo          🦊 BOTMARE - UNIFICADO DASHBOARD 🦊
echo ========================================================
if defined MISSING_ENV (
    color 0e
    echo  [!] ALERTA: Falta archivo .env ^(Configuracion^)
)
if defined MISSING_DEPS (
    color 0e
    echo  [!] ALERTA: Faltan dependencias ^(Ejecuta opcion 8^)
)
if defined MISSING_OUT (
    color 0c
    echo  [!] ALERTA: Interfaz no compilada ^(Ejecuta opcion 9^)
)
echo.
echo  [ 1 ] EJECUCION DEL SISTEMA
echo  --------------------------------------------------------
echo  1. MODO DESARROLLO (Recarga en vivo)
echo  2. MODO PRODUCCION (Iniciar con PM2)
echo  3. DETENER TODO (Stop PM2)
echo  4. VER LOGS EN TIEMPO REAL
echo.
echo  [ 2 ] MANTENIMIENTO Y SESION
echo  --------------------------------------------------------
echo  5. RESETEAR WHATSAPP (Cierra sesion y limpia QR)
echo  6. LIBERAR PUERTO (Limpia el puerto 8000)
echo  7. LIMPIAR CACHE (Borra dist, out y .next)
echo.
echo  [ 3 ] HERRAMIENTAS Y BUILD
echo  --------------------------------------------------------
echo  8. INSTALAR / REPARAR (Setup Completo)
echo  9. COMPILAR FRONTEND (Generar carpeta out)
echo  U. ACTUALIZAR (Git Pull + Install)
echo.
echo  [ 4 ] ACCESO RAPIDO
echo  --------------------------------------------------------
echo  D. Abrir Dashboard Local (http://localhost:8000)
echo  T. Iniciar Tunel Cloudflare (Exponer puerto 8000)
echo  X. Salir
echo.
echo ========================================================
set /p opcion=">> Seleccione una opcion: "

if "%opcion%"=="1" goto DEV_MODE
if "%opcion%"=="2" goto PROD_MODE
if "%opcion%"=="3" goto STOP_ALL
if "%opcion%"=="4" goto VIEW_LOGS
if "%opcion%"=="5" goto RESET_WA
if "%opcion%"=="6" goto KILL_PORTS
if "%opcion%"=="7" goto CLEAN_CACHE
if "%opcion%"=="8" goto RUN_SETUP
if "%opcion%"=="9" goto RUN_BUILD
if "%opcion%"=="U" goto UPDATE_GIT
if "%opcion%"=="u" goto UPDATE_GIT
if "%opcion%"=="D" goto OPEN_DASH
if "%opcion%"=="d" goto OPEN_DASH
if "%opcion%"=="T" goto START_TUNNEL
if "%opcion%"=="t" goto START_TUNNEL
if "%opcion%"=="X" exit
if "%opcion%"=="x" exit

goto MENU

:DEV_MODE
cls
echo [!] Iniciando en Modo Desarrollo...
call pnpm run dev
goto MENU

:PROD_MODE
cls
echo [!] Iniciando en Modo Produccion (PM2)...
if defined MISSING_OUT (
    echo [!] Detectado: Interfaz no compilada. Compilando ahora...
    call pnpm run build
) else (
    echo [?] ¿Deseas recompilar la interfaz antes de iniciar? (S/N)
    set /p rebuild=">> "
    if /i "!rebuild!"=="S" call pnpm run build
)

echo [!] Iniciando en PM2...
call pnpm run pm2:start
echo.
echo ✅ BotMaRe-Unified iniciado en segundo plano.
echo ✅ Dashboard Local: http://localhost:8000
pause
goto MENU

:STOP_ALL
cls
echo [!] Deteniendo todos los procesos...
call pnpm run pm2:delete
echo ✅ Procesos detenidos y eliminados de PM2.
pause
goto MENU

:VIEW_LOGS
cls
echo [!] Mostrando logs (Ctrl+C para salir)...
call pnpm run pm2:logs
goto MENU

:RESET_WA
cls
echo ========================================================
echo           RESETEAR SESION DE WHATSAPP
echo ========================================================
echo [!] Esto cerrara la sesion actual y pedira un nuevo QR.
set /p confirm="¿Estas seguro? (S/N): "
if /i "%confirm%" neq "S" goto MENU

echo Deteniendo procesos...
call npx pm2 stop all >nul 2>&1
echo Borrando datos de autenticacion...
if exist data\whatsapp_auth.db del /f /q data\whatsapp_auth.db
if exist auth_info_baileys rd /s /q auth_info_baileys
echo.
echo ✅ Sesion reseteada. Inicie el bot para ver el nuevo QR.
pause
goto MENU

:KILL_PORTS
cls
echo [!] Liberando puerto 8000...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8000 "') do (
    if "%%a" neq "0" (
        echo Matando PID %%a en puerto 8000
        taskkill /F /PID %%a >nul 2>&1
    )
)
echo ✅ Puerto 8000 libre.
pause
goto MENU

:CLEAN_CACHE
cls
echo [!] Limpiando archivos temporales...
if exist dist rd /s /q dist
if exist .next rd /s /q .next
if exist out rd /s /q out
echo ✅ Cache limpia.
pause
goto MENU

:RUN_SETUP
cls
echo [!] Iniciando configuracion completa...
if not exist ".env" (
    echo [!] Archivo .env no encontrado. Creando desde ejemplo...
    copy .env.example .env
    echo.
    set /p USER_PORT=">> [?] En que puerto quieres correr el bot? (Presiona Enter para usar 8000): "
    if "!USER_PORT!"=="" set USER_PORT=8000
    
    echo [!] Configurando puerto !USER_PORT!...
    powershell -Command "(Get-Content .env) -replace 'PORT=8000', 'PORT=!USER_PORT!' | Set-Content .env"
    powershell -Command "(Get-Content .env) -replace 'localhost:8000', 'localhost:!USER_PORT!' | Set-Content .env"
)
call pnpm install
echo ✅ Instalacion finalizada.
pause
goto MENU

:RUN_BUILD
cls
echo [!] Compilando Frontend (Export)...
call pnpm run build
echo ✅ Compilacion terminada. La carpeta 'out' esta lista.
pause
goto MENU

:UPDATE_GIT
cls
echo [!] Actualizando desde el repositorio...
call git pull
call pnpm install
echo ✅ Actualizacion finalizada.
pause
goto MENU

:OPEN_DASH
cls
echo [!] Abriendo Dashboard...
start http://localhost:8000
goto MENU

:START_TUNNEL
cls
echo [!] Iniciando Cloudflare Tunnel para el puerto 8000...
start cmd /c "title Cloudflare Tunnel && cloudflared tunnel --url http://localhost:8000"
echo ✅ Tunnel activo en ventana aparte.
pause
goto MENU
