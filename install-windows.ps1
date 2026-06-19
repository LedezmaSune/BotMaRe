$Host.UI.RawUI.WindowTitle = "Instalador Maestro - BotMaRe (Windows)"
# Colores
$cyan = [ConsoleColor]::Cyan
$green = [ConsoleColor]::Green
$yellow = [ConsoleColor]::Yellow
$red = [ConsoleColor]::Red

Write-Host "==========================================================" -ForegroundColor $cyan
Write-Host "    🦊 BOTMARE AI - INSTALADOR PARA WINDOWS (SIN ADMIN)    " -ForegroundColor $green
Write-Host "==========================================================" -ForegroundColor $cyan
Write-Host ""

# 1. Verificar Node.js
Write-Host "[1/5] Verificando Node.js..." -ForegroundColor $cyan
if (Get-Command "node" -ErrorAction SilentlyContinue) {
    $nodeVer = node -v
    Write-Host " ✔ Node.js detectado: $nodeVer" -ForegroundColor $green
    
    if ($nodeVer -match "^v24\.") {
        Write-Host " ⚠ ADVERTENCIA: Estás usando Node.js v24." -ForegroundColor $red
        Write-Host " Next.js y algunas librerías (como esbuild/sharp) tienen problemas conocidos de compatibilidad (Access Violation / EPERM) en Windows con esta versión." -ForegroundColor $yellow
        Write-Host " 👉 Se recomienda encarecidamente desinstalarla e instalar Node.js v22 LTS si falla la instalación." -ForegroundColor $yellow
        Start-Sleep -Seconds 5
    }
} else {
    Write-Host " ❌ Node.js NO está instalado. Es necesario para continuar." -ForegroundColor $red
    Write-Host " 👉 Descárgalo de: https://nodejs.org/ (Versión LTS)" -ForegroundColor $yellow
    Read-Host "`nPresiona Enter para salir..."
    exit
}

# 2. Verificar Git (Opcional pero recomendado)
if (!(Get-Command "git" -ErrorAction SilentlyContinue)) {
    Write-Host " ⚠ Git no está instalado. Si descargaste el .zip funcionará, pero se recomienda Git para actualizar." -ForegroundColor $yellow
}

# 3. Verificar e instalar pnpm
Write-Host "`n[2/5] Verificando gestor de paquetes pnpm..." -ForegroundColor $cyan
if (!(Get-Command "pnpm" -ErrorAction SilentlyContinue)) {
    Write-Host " ℹ pnpm no detectado. Instalando automáticamente (sin requerir permisos de administrador)..." -ForegroundColor $yellow
    npm install -g pnpm
}
$pnpmVer = pnpm -v
Write-Host " ✔ pnpm está listo (v$pnpmVer)." -ForegroundColor $green

# 4. Archivo .env
Write-Host "`n[3/5] Configurando archivo de entorno (.env)..." -ForegroundColor $cyan
if (!(Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Write-Host " ✔ Archivo .env creado a partir de la plantilla." -ForegroundColor $green
} else {
    Write-Host " ✔ El archivo .env ya existe. Se respetará tu configuración actual." -ForegroundColor $green
}

# 5. Instalar dependencias
Write-Host "`n[4/5] Instalando dependencias del proyecto..." -ForegroundColor $cyan
Write-Host " ℹ Esto puede tomar un par de minutos porque descargará y compilará las librerías. Por favor espera..." -ForegroundColor $yellow
pnpm install

if ($LASTEXITCODE -ne 0) {
    Write-Host " ❌ Hubo un error al instalar las dependencias." -ForegroundColor $red
    Read-Host "`nPresiona Enter para salir..."
    exit
}
Write-Host " ✔ Dependencias instaladas correctamente." -ForegroundColor $green

# 6. Compilar
Write-Host "`n[5/5] Compilando el Panel de Control Web..." -ForegroundColor $cyan
pnpm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host " ❌ Hubo un error al compilar el panel." -ForegroundColor $red
    Read-Host "`nPresiona Enter para salir..."
    exit
}
Write-Host " ✔ Compilación terminada." -ForegroundColor $green

Write-Host "`n==========================================================" -ForegroundColor $cyan
Write-Host " 🎉 INSTALACIÓN COMPLETADA CON ÉXITO 🎉" -ForegroundColor $green
Write-Host "==========================================================" -ForegroundColor $cyan
Write-Host ""
Write-Host "👉 PASO IMPORTANTE:" -ForegroundColor $yellow
Write-Host "Abre el archivo .env en esta carpeta con el Bloc de notas y coloca tus contraseñas y API Keys de Inteligencia Artificial." -ForegroundColor $cyan
Write-Host ""

$startMenu = Read-Host "¿Deseas abrir el Menú de BotMaRe ahora mismo? (s/n)"
if ($startMenu -match "^[sS]$") {
    pnpm run menu
} else {
    Write-Host "`nPuedes iniciar el bot más tarde simplemente haciendo doble clic en 'menu.bat' o ejecutando 'pnpm run menu'." -ForegroundColor $cyan
    Start-Sleep -Seconds 4
}
