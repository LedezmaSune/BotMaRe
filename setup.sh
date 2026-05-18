#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
#  🦊 BotMaRe AI - Setup Rápido (alias del instalador maestro)
#  Para la instalación completa usa: ./install.sh
# ═══════════════════════════════════════════════════════════════

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ -f "$SCRIPT_DIR/install.sh" ]; then
    exec bash "$SCRIPT_DIR/install.sh"
else
    echo "❌ No se encontró install.sh. Ejecutando instalación básica..."
    echo ""

    # Verificar Node.js
    if ! command -v node &>/dev/null; then
        echo "❌ Node.js no está instalado."
        echo "   Descárgalo en: https://nodejs.org/"
        exit 1
    fi

    # Instalar dependencias
    echo "[1/3] Instalando dependencias..."
    npm install -g pnpm pm2
    pnpm config set ignore-scripts false
    pnpm install

    # Configurar .env
    echo "[2/3] Configurando archivo .env..."
    if [ ! -f ".env" ]; then
        cp .env.example .env
        echo "[!] Archivo .env creado. Edítalo con tus API Keys."
    else
        echo "Archivo .env ya existe."
    fi

    # Finalizar
    echo "[3/3] ¡Listo!"
    echo ""
    echo "✅ Instalación completada."
    echo "   Ejecuta 'pnpm run start' para iniciar."
fi
