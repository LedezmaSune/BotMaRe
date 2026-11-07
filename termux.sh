#!/data/data/com.termux/files/usr/bin/bash
# ═══════════════════════════════════════════════════════════════════
#  🦊 BotMaRe AI - Lanzador & Actualizador Todo-en-Uno para Termux
# ═══════════════════════════════════════════════════════════════════

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo ""
echo "🦊 =========================================="
echo "   BOTMARE AI - AUTO-INICIADOR TERMUX"
echo "=========================================="
echo ""

# 1. Traer últimos cambios de GitHub
if command -v git &>/dev/null && [ -d ".git" ]; then
    echo "📥 [1/3] Sincronizando últimas actualizaciones de GitHub..."
    git pull origin main 2>/dev/null || echo "   (Modo offline o sin conexión a Git, continuando...)"
fi

# 2. Asegurar dependencias de Node.js
if [ ! -d "node_modules" ] || [ ! -d "node_modules/@whiskeysockets/baileys" ]; then
    echo "📦 [2/3] Instalando dependencias necesarias (modo secuencial 1x1)..."
    pnpm install --ignore-scripts --network-concurrency 1 --fetch-timeout 1800000 --fetch-retries 10
fi

# 2.1 Asegurar herramientas C++ y compilación de SQLite nativo en Termux
if ! node -e "require('better-sqlite3')" &>/dev/null; then
    echo "⚙️ [2.1] Preparando SQLite nativo para Termux Android..."
    if ! command -v clang &>/dev/null || ! command -v sqlite3 &>/dev/null || ! command -v make &>/dev/null; then
        echo "   Instalando compiladores y librerías del sistema (clang, make, python, sqlite)..."
        pkg install clang make python sqlite -y
    fi
    if ! command -v node-gyp &>/dev/null; then
        echo "   Instalando node-gyp..."
        npm install -g node-gyp@latest 2>/dev/null || true
    fi
    mkdir -p ~/.gyp && echo "{'variables':{'android_ndk_path':''}}" > ~/.gyp/include.gypi
    export TERMUX_PREFIX="/data/data/com.termux/files/usr"
    export CC=clang CXX=clang++ LINK=clang++
    export npm_config_build_from_source=true
    export npm_config_sqlite="$TERMUX_PREFIX"
    echo "   Compilando better-sqlite3 para Android Clang..."
    pnpm rebuild better-sqlite3 --build-from-source --sqlite="$TERMUX_PREFIX" 2>/dev/null || \
    npm rebuild better-sqlite3 --build-from-source --sqlite="$TERMUX_PREFIX" 2>/dev/null || \
    echo "   (Nota: Se activará el almacenamiento multi-archivo resiliente como respaldo automático)"
fi

# 3. Arrancar BotMaRe
# Nota: bin/check-build.js descomprime el Dashboard en 0.2s y compila SQLite automáticamente si falta
echo "🚀 [3/3] Levantando servicios de BotMaRe..."
pnpm start
