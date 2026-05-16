@echo off
setlocal enabledelayedexpansion
title BotMaRe - Unificado Setup
color 0b

echo ========================================================
echo          🦊 BOTMARE - INSTALADOR MAESTRO 🦊
echo ========================================================
echo.

:: Configurar esta carpeta como segura en Git para evitar errores de "dubious ownership"
git config --global --add safe.directory "%cd:\=/%" >nul 2>&1

:: 1. Verificar Node.js
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo ❌ [ERROR] Node.js no esta instalado.
    echo.
    echo BotMaRe necesita Node.js para funcionar. 
    echo Descargalo en: https://nodejs.org/
    echo.
    pause
    exit /b
)

:: 2. Instalar dependencias
echo [1/3] Instalando dependencias del sistema...
call npm install -g pnpm pm2
call pnpm config set ignore-scripts false
call pnpm install
if %errorlevel% neq 0 (
    echo.
    echo ❌ [ERROR] Error al instalar dependencias.
    echo Revisa tu conexion a internet o permisos.
    pause
    exit /b
)

:: 3. Configurar archivo .env
echo [2/3] Configurando archivo de entorno (.env)...

if not exist ".env" (
    echo Creando archivo .env desde plantilla...
    copy ".env.example" ".env"
    
    echo.
    set /p USER_PORT=">> [?] En que puerto quieres correr el bot? (Presiona Enter para usar 8000): "
    if "!USER_PORT!"=="" set USER_PORT=8000

    echo [!] Configurando puerto !USER_PORT! en el sistema...
    
    :: Usamos PowerShell para editar el archivo de forma segura
    powershell -Command "(Get-Content .env) -replace 'PORT=8000', 'PORT=!USER_PORT!' | Set-Content .env"
    powershell -Command "(Get-Content .env) -replace 'localhost:8000', 'localhost:!USER_PORT!' | Set-Content .env"

    echo.
    echo [!] IMPORTANTE: Se ha creado tu archivo .env con el puerto !USER_PORT!
    echo     EDÍTALO y pon tus API Keys de IA antes de iniciar.
) else (
    echo El archivo .env ya existe, respetando configuracion actual.
)

:: 4. Finalización
echo [3/3] Preparando el sistema para el primer arranque...
echo.
echo ========================================================
echo ✅ INSTALACION COMPLETADA CON EXITO
echo ========================================================
echo.
echo 📝 SIGUIENTES PASOS:
echo 1. Abre el archivo .env y configura tus llaves de IA.
echo 2. Ejecuta 'manager.bat' y elige la opcion 9 para compilar.
echo 3. Inicia el sistema con la opcion 1 o 2 del manager.
echo ========================================================
echo.
pause
