@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"
title CortexPM2 - Panel de Control
mode con: cols=85 lines=30
chcp 65001 > nul

:: Verificar si el archivo ecosystem existe
if not exist ecosystem.config.js (
    echo.
    echo  [!] ADVERTENCIA: No se encontró ecosystem.config.js
    echo  [!] El sistema intentará usar la configuración por defecto.
    echo.
)

:MENU
cls
echo.
echo  ===========================================================================
echo      C O R T E X   P M 2   -   D A S H B O A R D
echo  ===========================================================================
echo                     SISTEMA DE GESTIÓN DINÁMICO
echo  ===========================================================================
echo.
echo    [1] 🚀 INICIAR BOT (PM2)
echo    [2] ⏹️  DETENER BOT
echo    [3] 🔄 REINICIAR SISTEMA
echo    [4] 📋 VER LOGS EN TIEMPO REAL
echo    [5] 📊 MONITOR DE RECURSOS (CPU/RAM)
echo    [6] 🛠️  SETUP / ACTUALIZAR
echo    [7] 🧹 RESETEAR SESIÓN (QR NUEVO)
echo    [8] 📂 ABRIR CARPETA
echo    [0] ❌ SALIR
echo.
echo  ===========================================================================
set /p opt=" > Seleccione una opción: "

if "%opt%"=="1" goto START_BOT
if "%opt%"=="2" goto STOP_BOT
if "%opt%"=="3" goto RESTART_BOT
if "%opt%"=="4" goto VIEW_LOGS
if "%opt%"=="5" goto MONIT
if "%opt%"=="6" goto SETUP
if "%opt%"=="7" goto RESET_WA
if "%opt%"=="8" goto OPEN_LOGS
if "%opt%"=="0" exit
goto MENU

:START_BOT
echo.
echo [INFO] Iniciando instancia con PM2...
npm run pm2:start
if %errorlevel% neq 0 (
    echo [ERROR] Hubo un problema al iniciar. Asegúrate de tener PM2 instalado: npm install -g pm2
    pause
)
goto MENU

:STOP_BOT
echo.
npm run pm2:stop
pause
goto MENU

:RESTART_BOT
echo.
npm run pm2:restart
pause
goto MENU

:VIEW_LOGS
echo.
npm run pm2:logs
goto MENU

:MONIT
echo.
npm run pm2:monit
goto MENU

:SETUP
echo.
call npm run setup
pause
goto MENU

:RESET_WA
echo.
set /p confirm=" ¿Borrar sesión? (s/n): "
if /i "%confirm%"=="s" (
    npm run reset:wa
)
pause
goto MENU

:OPEN_LOGS
start explorer .
goto MENU
