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
    echo "📦 [2/3] Instalando dependencias necesarias (modo seguro Termux)..."
    pnpm install --ignore-scripts
fi

# 3. Arrancar BotMaRe
# Nota: bin/check-build.js descomprime el Dashboard en 0.2s y compila SQLite automáticamente si falta
echo "🚀 [3/3] Levantando servicios de BotMaRe..."
pnpm start
