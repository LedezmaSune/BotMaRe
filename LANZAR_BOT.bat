@echo off
setlocal enabledelayedexpansion
:: Detectar la carpeta donde esta el .bat
cd /d "%~dp0"

:: Obtener el nombre de la carpeta (sera el nombre del bot)
for %%I in ("%CD%") do set "BOT_NAME=%%~nxI"

title Iniciando Bot: %BOT_NAME%
cls
echo ===================================================
echo    LANZADOR DE INSTANCIA - PM2
echo ===================================================
echo.
echo  ESTAS EN LA CARPETA: %CD%
echo  NOMBRE DEL BOT     : %BOT_NAME%
echo.
echo  [INFO] Ejecutando ecosystem.config.js...
echo ===================================================
echo.

:: Ejecutar el comando de inicio
call npm run pm2:start

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] No se pudo iniciar el bot. 
    echo Asegurate de haber corrido 'npm run setup' primero.
    pause
) else (
    echo.
    echo [OK] El bot '%BOT_NAME%' esta arrancando en segundo plano.
    echo Puedes cerrar esta ventana.
    timeout /t 5
)
