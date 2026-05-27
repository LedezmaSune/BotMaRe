#!/data/data/com.termux/files/usr/bin/bash
# ═══════════════════════════════════════════════════════════════════
#  🦊 BotMaRe AI - Instalador para Termux (Android)
#  Versión: 1.0  •  2026
#
#  USO REMOTO (copiar y pegar en Termux):
#    curl -fsSL https://raw.githubusercontent.com/LedezmaSune/BotMaRe/main/install-termux.sh | bash
#
#  USO LOCAL (desde el repositorio clonado):
#    chmod +x install-termux.sh && ./install-termux.sh
# ═══════════════════════════════════════════════════════════════════

# ── Colores ────────────────────────────────────────────────────────
BOLD='\033[1m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
MAGENTA='\033[0;35m'
NC='\033[0m'

info()    { echo -e "${CYAN}  ℹ ${NC}$1"; }
ok()      { echo -e "${GREEN}  ✓ ${NC}$1"; }
warn()    { echo -e "${YELLOW}  ⚠ ${NC}$1"; }
fail()    { echo -e "${RED}  ✗ ${NC}$1"; }
banner()  { echo -e "${BLUE}${BOLD}$1${NC}"; }
step()    { echo -e "\n${MAGENTA}${BOLD}[$1/$TOTAL_STEPS]${NC} ${BOLD}$2${NC}"; }
divider() { echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"; }

TOTAL_STEPS=6
REPO_URL="https://github.com/LedezmaSune/BotMaRe.git"
INSTALL_DIR="BotMaRe"

# ── Detección de modo interactivo ─────────────────────────────────
INTERACTIVE=false
if [ -t 0 ]; then
    INTERACTIVE=true
fi

ask() {
    local prompt="$1"
    local default="$2"
    local varname="$3"
    if $INTERACTIVE; then
        read -rp "$prompt" "$varname" </dev/tty
        if [ -z "${!varname}" ]; then
            eval "$varname='$default'"
        fi
    else
        eval "$varname='$default'"
    fi
}

ask_yn() {
    local prompt="$1"
    local default="$2"
    local varname="$3"
    if $INTERACTIVE; then
        read -rp "$prompt" "$varname" </dev/tty
        if [ -z "${!varname}" ]; then
            eval "$varname='$default'"
        fi
    else
        eval "$varname='$default'"
    fi
}

# ═══════════════════════════════════════════════════════════════════
#                        INICIO DEL SCRIPT
# ═══════════════════════════════════════════════════════════════════
clear 2>/dev/null || true
divider
banner "       🦊 BOTMARE AI - INSTALADOR PARA TERMUX 🦊"
banner "          Plataforma WhatsApp con IA Avanzada"
banner "                📱 Android Edition"
divider
echo ""

# ── Verificar que estamos en Termux ───────────────────────────────
if [ ! -d "/data/data/com.termux" ]; then
    fail "Este script está diseñado para ejecutarse en Termux."
    fail "Si estás en un servidor Linux, usa install.sh en su lugar."
    exit 1
fi

if $INTERACTIVE; then
    info "Modo: ${BOLD}Interactivo${NC} (terminal detectado)"
else
    info "Modo: ${BOLD}Automático${NC} (curl | bash detectado)"
fi
info "Entorno: ${BOLD}Termux (Android)${NC}"
info "Arch: ${BOLD}$(uname -m)${NC}"
echo ""

# ═══════════════════════════════════════════════════════════════════
# PASO 0: Clonar repositorio si no estamos dentro
# ═══════════════════════════════════════════════════════════════════
if [ -f "package.json" ] && grep -q "botmare-unified" package.json 2>/dev/null; then
    WORK_DIR="$(pwd)"
    info "Repositorio BotMaRe detectado en: ${BOLD}${WORK_DIR}${NC}"
else
    step 0 "Clonando repositorio BotMaRe..."

    if ! command -v git &>/dev/null; then
        info "Instalando git..."
        pkg install git -y
    fi

    if [ -d "$INSTALL_DIR" ]; then
        warn "La carpeta '$INSTALL_DIR' ya existe."
        ask_yn "  ¿Deseas usarla? (s/n): " "s" USE_EXISTING
        if [[ "$USE_EXISTING" =~ ^[Ss]$ ]]; then
            cd "$INSTALL_DIR"
        else
            fail "Renombra o elimina la carpeta e intenta de nuevo."
            exit 1
        fi
    else
        git clone "$REPO_URL" "$INSTALL_DIR"
        cd "$INSTALL_DIR"
    fi

    WORK_DIR="$(pwd)"
    ok "Repositorio en: ${BOLD}${WORK_DIR}${NC}"
fi

echo ""
info "Directorio de trabajo: ${BOLD}${WORK_DIR}${NC}"

# ═══════════════════════════════════════════════════════════════════
# PASO 1: Instalar dependencias del sistema (Termux)
# ═══════════════════════════════════════════════════════════════════
step 1 "Instalando dependencias del sistema (Termux)..."

info "Actualizando repositorios de Termux..."
pkg update -y && pkg upgrade -y

info "Instalando paquetes necesarios..."
# nodejs: runtime principal
# python: requerido por node-gyp para compilar módulos nativos
# make: herramienta de build
# clang: compilador C/C++ (Termux no tiene gcc, usa clang)
# binutils: linker y herramientas binarias
# sqlite: librería nativa de SQLite (usada por better-sqlite3)
# git: control de versiones
# curl: descargas HTTP
# openssl: cifrado/TLS
# tmate: túnel SSH reverso
# tailscale: red privada virtual (VPN)
pkg install nodejs python make clang binutils sqlite git curl openssl tmate tailscale -y

info "Instalando Cloudflare Tunnel (cloudflared) para Android..."
if pkg install tur-repo -y && pkg install cloudflared -y; then
    ok "cloudflared instalado con éxito desde el repositorio TUR."
else
    warn "No se pudo instalar desde el repositorio TUR. Intentando descarga directa del binario..."
    ARCH=$(uname -m)
    if [[ "$ARCH" == "aarch64" ]]; then
        curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64 -o $PREFIX/bin/cloudflared && \
        chmod +x $PREFIX/bin/cloudflared
        ok "cloudflared (ARM64) instalado con éxito en $PREFIX/bin/."
    elif [[ "$ARCH" == "armv7"* || "$ARCH" == "armv8"* ]]; then
        curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm -o $PREFIX/bin/cloudflared && \
        chmod +x $PREFIX/bin/cloudflared
        ok "cloudflared (ARM 32-bit) instalado con éxito en $PREFIX/bin/."
    else
        warn "Arquitectura no soportada para descarga directa. Instala cloudflared manualmente."
    fi
fi

ok "Paquetes del sistema y túneles instalados."

# ═══════════════════════════════════════════════════════════════════
# PASO 2: Configurar entorno de compilación para Termux
# ═══════════════════════════════════════════════════════════════════
step 2 "Configurando entorno de compilación nativo..."

# En Termux, node-gyp necesita saber dónde están las herramientas
# El prefijo de Termux es /data/data/com.termux/files/usr
TERMUX_PREFIX="/data/data/com.termux/files/usr"

# Configurar variables de entorno para que node-gyp encuentre todo
export CC=clang
export CXX=clang++
export LINK=clang++
export GYP_DEFINES="OS=android"

# Forzar compilación nativa desde código fuente de better-sqlite3 usando la SQLite de Termux
export npm_config_build_from_source=true
export npm_config_sqlite="$TERMUX_PREFIX"

# Configurar npm para usar Python de Termux
npm config set python "$TERMUX_PREFIX/bin/python3" 2>/dev/null || true

ok "Entorno de compilación configurado (clang/clang++ y SQLite nativo)."

# ═══════════════════════════════════════════════════════════════════
# PASO 3: Instalar pnpm
# ═══════════════════════════════════════════════════════════════════
step 3 "Instalando gestores de paquetes..."

if ! command -v pnpm &>/dev/null; then
    info "Instalando pnpm..."
    npm install -g pnpm
    ok "pnpm instalado."
else
    ok "pnpm $(pnpm -v) ya disponible."
fi

# PM2 es opcional en Termux (se puede usar tmux en su lugar)
if ! command -v pm2 &>/dev/null; then
    info "Instalando PM2 (opcional, para ejecución en segundo plano)..."
    npm install -g pm2 2>/dev/null || warn "PM2 no se pudo instalar. Puedes usar tmux como alternativa."
fi

# ═══════════════════════════════════════════════════════════════════
# PASO 4: Instalar dependencias del proyecto
# ═══════════════════════════════════════════════════════════════════
step 4 "Instalando dependencias del proyecto..."

info "Este paso puede tomar varios minutos en Termux."
info "Compilando módulos nativos (better-sqlite3, etc.)..."
echo ""

# Intentar instalar con build-from-source para better-sqlite3
pnpm install

if [ $? -eq 0 ]; then
    ok "¡Todas las dependencias instaladas correctamente!"
else
    warn "Hubo errores. Intentando recompilar better-sqlite3..."
    
    # Intentar compilar better-sqlite3 con la SQLite del sistema
    cd node_modules/better-sqlite3 2>/dev/null && \
        npx node-gyp rebuild --build-from-source \
            --sqlite="$TERMUX_PREFIX" 2>/dev/null && \
        cd ../..

    if [ $? -eq 0 ]; then
        ok "better-sqlite3 recompilado exitosamente."
    else
        fail "Error compilando better-sqlite3."
        echo ""
        warn "Intenta manualmente:"
        echo -e "  ${CYAN}pnpm rebuild better-sqlite3 --build-from-source${NC}"
        echo ""
        warn "Si sigue fallando, prueba:"
        echo -e "  ${CYAN}npm install better-sqlite3 --build-from-source --sqlite=$TERMUX_PREFIX${NC}"
    fi
fi

# ═══════════════════════════════════════════════════════════════════
# PASO 5: Configurar .env
# ═══════════════════════════════════════════════════════════════════
step 5 "Configurando variables de entorno..."

USER_PORT="8000"

if [ ! -f ".env" ]; then
    cp .env.example .env
    
    ask "  ¿En qué puerto ejecutar BotMaRe? (Enter = 8000): " "8000" USER_PORT
    
    sed -i "s/PORT=8000/PORT=${USER_PORT}/" .env
    sed -i "s/localhost:8000/localhost:${USER_PORT}/" .env

    ok "Archivo .env creado con puerto ${USER_PORT}."
    echo ""
    echo -e "${YELLOW}  ╔════════════════════════════════════════════════════════╗${NC}"
    echo -e "${YELLOW}  ║  ${BOLD}¡IMPORTANTE!${NC}${YELLOW} Edita .env con tus claves de API:        ║${NC}"
    echo -e "${YELLOW}  ║                                                        ║${NC}"
    echo -e "${YELLOW}  ║  • DASHBOARD_USER / DASHBOARD_PASS                     ║${NC}"
    echo -e "${YELLOW}  ║  • Al menos 1 API Key de IA (GEMINI, GROQ, etc.)       ║${NC}"
    echo -e "${YELLOW}  ║  • TELEGRAM_BOT_TOKEN (opcional)                       ║${NC}"
    echo -e "${YELLOW}  ╚════════════════════════════════════════════════════════╝${NC}"
else
    ok "Archivo .env ya existe."
    USER_PORT=$(grep -m1 '^PORT=' .env 2>/dev/null | cut -d= -f2 || echo "8000")
    USER_PORT=${USER_PORT:-8000}
fi

# ═══════════════════════════════════════════════════════════════════
# PASO 6: Compilar Frontend
# ═══════════════════════════════════════════════════════════════════
step 6 "Compilando interfaz del Dashboard..."

echo ""
echo -e "${YELLOW}  ⚠  La compilación de Next.js puede ser intensiva en memoria.${NC}"
echo -e "${YELLOW}     Si tu teléfono tiene menos de 4 GB de RAM, podría fallar.${NC}"
echo -e "${YELLOW}     En ese caso, compila en una PC y copia la carpeta 'out/'.${NC}"
echo ""

ask_yn "  ¿Compilar el frontend ahora? (s/n): " "s" DO_BUILD

if [[ "$DO_BUILD" =~ ^[Ss]$ ]]; then
    info "Compilando... (esto puede tomar varios minutos)"
    
    # Limitar la memoria de Node para evitar que Termux mate el proceso
    export NODE_OPTIONS="--max-old-space-size=1024"
    
    if pnpm run build; then
        ok "¡Dashboard compilado exitosamente!"
    else
        fail "Error durante la compilación."
        echo ""
        warn "Opciones alternativas:"
        echo -e "  ${CYAN}1.${NC} Compila en una PC y copia la carpeta ${BOLD}out/${NC} a Termux."
        echo -e "  ${CYAN}2.${NC} Usa modo desarrollo: ${CYAN}pnpm run dev${NC} (no requiere build)."
        echo -e "  ${CYAN}3.${NC} Intenta de nuevo con más memoria libre (cierra otras apps)."
    fi
else
    warn "Build omitido. Puedes usar 'pnpm run dev' (no requiere build)."
fi

# ═══════════════════════════════════════════════════════════════════
#                     RESUMEN FINAL
# ═══════════════════════════════════════════════════════════════════
echo ""
divider
banner "        ✅ INSTALACIÓN EN TERMUX COMPLETADA"
divider
echo ""
echo -e "${BOLD}  📝 SIGUIENTES PASOS:${NC}"
echo ""
echo -e "  ${CYAN}1.${NC} Edita el archivo .env con tus claves de API:"
echo -e "     ${CYAN}nano .env${NC}"
echo ""
echo -e "  ${CYAN}2.${NC} Inicia BotMaRe:"
echo -e "     ${GREEN}▸ Modo Desarrollo:${NC}    pnpm run dev"
echo -e "     ${GREEN}▸ Modo Producción:${NC}    pnpm run start"
echo ""
echo -e "  ${CYAN}3.${NC} Abre en tu navegador: ${BOLD}http://localhost:${USER_PORT}${NC}"
echo -e "     (En el mismo teléfono usa Chrome/Firefox)"
echo ""
echo -e "${BOLD}  📱 TIPS PARA TERMUX:${NC}"
echo ""
echo -e "  ${CYAN}•${NC} Usa ${BOLD}tmux${NC} para mantener BotMaRe corriendo en segundo plano:"
echo -e "    ${CYAN}pkg install tmux${NC}"
echo -e "    ${CYAN}tmux new -s botmare${NC}"
echo -e "    ${CYAN}pnpm run start${NC}"
echo -e "    (Presiona ${BOLD}Ctrl+B${NC} luego ${BOLD}D${NC} para salir sin detener)"
echo ""
echo -e "  ${CYAN}•${NC} Para volver a la sesión: ${CYAN}tmux attach -t botmare${NC}"
echo ""
echo -e "  ${CYAN}•${NC} Desactiva la optimización de batería para Termux en"
echo -e "    Ajustes > Aplicaciones > Termux > Batería > Sin restricciones"
echo ""
echo -e "  ${CYAN}•${NC} Si necesitas túnel: ${CYAN}pkg install cloudflared${NC}"
echo ""
divider
echo ""

# Preguntar si iniciar ahora
if $INTERACTIVE; then
    ask_yn "  ¿Iniciar BotMaRe ahora? (s/n): " "n" START_NOW

    if [[ "$START_NOW" =~ ^[Ss]$ ]]; then
        echo ""
        echo -e "  ${BOLD}Selecciona modo:${NC}"
        echo -e "  ${CYAN}1.${NC} Desarrollo (dev) - Recomendado para primera vez"
        echo -e "  ${CYAN}2.${NC} Producción (start)"
        echo ""
        ask "  Opción (1/2): " "1" START_MODE

        case "$START_MODE" in
            1) exec pnpm run dev ;;
            2) exec pnpm run start ;;
            *) warn "Opción no válida." ;;
        esac
    fi
else
    info "Modo automático finalizado. Inicia con:"
    echo -e "  ${CYAN}cd ${WORK_DIR}${NC}"
    echo -e "  ${CYAN}nano .env${NC}"
    echo -e "  ${CYAN}pnpm run dev${NC}"
fi

echo ""
echo -e "${BOLD}  🦊 ¡BotMaRe AI corriendo en tu bolsillo!${NC}"
echo ""
