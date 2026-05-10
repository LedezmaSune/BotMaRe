@echo off
setlocal enabledelayedexpansion

title 🦊 BotMaRe AI - Actualizador Pro
color 0B

echo =======================================================
echo      🦊 INICIANDO ACTUALIZACION DE BOTMARE AI
echo =======================================================

:: 1. Verificar Git
where git >nul 2>nul
if %errorlevel% neq 0 (
    color 0C
    echo [!] ERROR: Git no esta instalado o no esta en el PATH.
    pause
    exit /b
)

:: 2. Respaldo preventivo
echo [1/5] Creando respaldo de seguridad...
if not exist "backups\pre-update" mkdir "backups\pre-update"
if exist "data\database.db" copy "data\database.db" "backups\pre-update\" >nul
if exist ".env" copy ".env" "backups\pre-update\" >nul
echo    OK - Respaldo guardado.

:: 3. Sincronizar GitHub
echo [2/5] Descargando cambios desde GitHub...
git reset --hard HEAD
git pull origin main
if %errorlevel% neq 0 (
    color 0C
    echo [!] ERROR: Fallo al descargar cambios.
    pause
    exit /b
)
echo    OK - Codigo actualizado.

:: 4. Instalar librerias
echo [3/5] Actualizando librerias (npm install)...
call npm install --quiet
echo    OK - Librerias al dia.

:: 5. Reconstruir Dashboard
echo [4/5] Reconstruyendo interfaz (npm run build)...
call npm run build
if %errorlevel% neq 0 (
    color 0C
    echo [!] ERROR: Fallo al reconstruir el Dashboard.
    pause
    exit /b
)
echo    OK - Dashboard listo.

:: 6. Finalizar
echo [5/5] Finalizando...
echo =======================================================
echo      ✅ ACTUALIZACION COMPLETADA CON EXITO
echo =======================================================

set /p choice="¿Deseas iniciar el bot ahora? (s/n): "
if /i "%choice%"=="s" (
    call npm start
)

pause
