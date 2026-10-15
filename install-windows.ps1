$Host.UI.RawUI.WindowTitle = "Instalador Maestro - BotMaRe (Windows)"
# Colores
$cyan = [ConsoleColor]::Cyan
$green = [ConsoleColor]::Green
$yellow = [ConsoleColor]::Yellow
$red = [ConsoleColor]::Red

Write-Host "==========================================================" -ForegroundColor $cyan
Write-Host "    BOTMARE AI - INSTALADOR PARA WINDOWS (SIN ADMIN)      " -ForegroundColor $green
Write-Host "==========================================================" -ForegroundColor $cyan
Write-Host ""

# 1. Verificar Node.js
Write-Host "[1/5] Verificando Node.js..." -ForegroundColor $cyan
if (Get-Command "node" -ErrorAction SilentlyContinue) {
    $nodeVer = node -v
    Write-Host " [OK] Node.js detectado: $nodeVer" -ForegroundColor $green
    
    if ($nodeVer -match "^v24\.") {
        Write-Host " [!] ADVERTENCIA: Estas usando Node.js v24." -ForegroundColor $red
        Write-Host " Next.js y algunas librerias (como esbuild/sharp) tienen problemas conocidos de compatibilidad (Access Violation / EPERM) en Windows con esta version." -ForegroundColor $yellow
        Write-Host " -> Se recomienda encarecidamente desinstalarla e instalar Node.js v22 LTS si falla la instalacion." -ForegroundColor $yellow
        Start-Sleep -Seconds 3
    }
} else {
    Write-Host " [X] Node.js NO esta instalado. Es necesario para continuar." -ForegroundColor $red
    Write-Host " -> Descargalo de: https://nodejs.org/ (Version LTS)" -ForegroundColor $yellow
    Read-Host "`nPresiona Enter para salir..."
    exit
}

# 2. Verificar Git (Opcional pero recomendado)
if (!(Get-Command "git" -ErrorAction SilentlyContinue)) {
    Write-Host " [!] Git no esta instalado. Si descargaste el .zip funcionara, pero se recomienda Git para actualizar." -ForegroundColor $yellow
}

# 3. Verificar e instalar pnpm
Write-Host "`n[2/5] Verificando gestor de paquetes pnpm..." -ForegroundColor $cyan
if (!(Get-Command "pnpm" -ErrorAction SilentlyContinue)) {
    Write-Host " [*] pnpm no detectado. Instalando automaticamente (sin requerir permisos de administrador)..." -ForegroundColor $yellow
    npm install -g pnpm
}
$pnpmVer = pnpm -v
Write-Host " [OK] pnpm esta listo (v$pnpmVer)." -ForegroundColor $green

# 4. Archivo .env
Write-Host "`n[3/5] Configurando archivo de entorno (.env)..." -ForegroundColor $cyan
if (!(Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Write-Host " [OK] Archivo .env creado a partir de la plantilla." -ForegroundColor $green
} else {
    Write-Host " [OK] El archivo .env ya existe. Se respetara tu configuracion actual." -ForegroundColor $green
}

# 5. Instalar dependencias
Write-Host "`n[4/5] Instalando dependencias del proyecto..." -ForegroundColor $cyan
Write-Host " [*] Esto puede tomar un par de minutos porque descargara y compilara las librerias. Por favor espera..." -ForegroundColor $yellow
pnpm install

if ($LASTEXITCODE -ne 0) {
    Write-Host " [X] Hubo un error al instalar las dependencias." -ForegroundColor $red
    Read-Host "`nPresiona Enter para salir..."
    exit
}
Write-Host " [OK] Dependencias instaladas correctamente." -ForegroundColor $green

# 6. Compilar
Write-Host "`n[5/5] Compilando el Panel de Control Web..." -ForegroundColor $cyan
pnpm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host " [X] Hubo un error al compilar el panel." -ForegroundColor $red
    Read-Host "`nPresiona Enter para salir..."
    exit
}
Write-Host " [OK] Compilacion terminada." -ForegroundColor $green

Write-Host "`n==========================================================" -ForegroundColor $cyan
Write-Host "  *** INSTALACION COMPLETADA CON EXITO ***               " -ForegroundColor $green
Write-Host "==========================================================" -ForegroundColor $cyan
Write-Host ""
Write-Host "-> PASO IMPORTANTE:" -ForegroundColor $yellow
Write-Host "Abre el archivo .env en esta carpeta con el Bloc de notas y coloca tus contrasenas y API Keys de Inteligencia Artificial." -ForegroundColor $cyan
Write-Host ""

$startMenu = Read-Host "Deseas abrir el Menu de BotMaRe ahora mismo? (s/n)"
if ($startMenu -match "^[sS]$") {
    pnpm run menu
} else {
    Write-Host "`nPuedes iniciar el bot mas tarde simplemente ejecutando 'pnpm run menu' o 'START.bat'." -ForegroundColor $cyan
    Start-Sleep -Seconds 4
}
