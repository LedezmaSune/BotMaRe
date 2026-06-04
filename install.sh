#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
#  🦊 BotMaRe AI - Instalador Maestro para Linux / macOS
#  Versión: 3.0  •  2026
#
#  USO REMOTO (una sola línea, instala todo desde cero):
#    curl -fsSL https://raw.githubusercontent.com/LedezmaSune/BotMaRe/main/install.sh | bash
#
#  USO LOCAL (desde el repositorio clonado):
#    chmod +x install.sh && ./install.sh
# ═══════════════════════════════════════════════════════════════════

# ── Colores y estilos ──────────────────────────────────────────────
BOLD='\033[1m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
MAGENTA='\033[0;35m'
NC='\033[0m'

# ── Funciones de utilidad ──────────────────────────────────────────
info()    { echo -e "${CYAN}  ℹ ${NC}$1"; }
ok()      { echo -e "${GREEN}  ✓ ${NC}$1"; }
warn()    { echo -e "${YELLOW}  ⚠ ${NC}$1"; }
fail()    { echo -e "${RED}  ✗ ${NC}$1"; }
banner()  { echo -e "${BLUE}${BOLD}$1${NC}"; }
step()    { echo -e "\n${MAGENTA}${BOLD}[$1/$TOTAL_STEPS]${NC} ${BOLD}$2${NC}"; }
divider() { echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"; }

TOTAL_STEPS=7
REPO_URL="https://github.com/LedezmaSune/BotMaRe.git"
INSTALL_DIR="BotMaRe"

# ── Detección de modo interactivo ─────────────────────────────────
# Cuando se ejecuta con curl|bash, stdin NO es un terminal (TTY).
# Detectamos esto para usar valores por defecto automáticamente.
INTERACTIVE=false
if [ -t 0 ]; then
    INTERACTIVE=true
fi

# Función segura para leer input del usuario.
# En modo pipe (curl|bash) retorna el valor por defecto sin preguntar.
ask() {
    local prompt="$1"
    local default="$2"
    local varname="$3"

    if $INTERACTIVE; then
        read -rp "$prompt" "$varname" </dev/tty
        # Si el usuario presionó Enter sin escribir nada, usar default
        if [ -z "${!varname}" ]; then
            eval "$varname='$default'"
        fi
    else
        eval "$varname='$default'"
    fi
}

# Función segura para preguntar sí/no.
# En modo pipe retorna el valor por defecto.
ask_yn() {
    local prompt="$1"
    local default="$2"  # "s" o "n"
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

# ── Detección de SO ────────────────────────────────────────────────
detect_os() {
    OS="unknown"
    if [[ "${OSTYPE:-linux}" == "linux-gnu"* ]] || [ -f /etc/os-release ]; then
        if command -v apt-get &>/dev/null; then
            OS="debian"
        elif command -v yum &>/dev/null; then
            OS="rhel"
        elif command -v pacman &>/dev/null; then
            OS="arch"
        else
            OS="linux"
        fi
    elif [[ "${OSTYPE:-}" == "darwin"* ]]; then
        OS="macos"
    fi
}

# ═══════════════════════════════════════════════════════════════════
#                        INICIO DEL SCRIPT
# ═══════════════════════════════════════════════════════════════════
clear 2>/dev/null || true
divider
banner "          🦊 BOTMARE AI - INSTALADOR MAESTRO 🦊"
banner "          Plataforma WhatsApp con IA Avanzada"
divider
echo ""

detect_os

if $INTERACTIVE; then
    info "Modo: ${BOLD}Interactivo${NC} (terminal detectado)"
else
    info "Modo: ${BOLD}Automático${NC} (curl | bash detectado)"
fi
info "Sistema operativo: ${BOLD}${OSTYPE:-linux}${NC} ($OS)"
echo ""

# ═══════════════════════════════════════════════════════════════════
# PASO 0: Si no estamos dentro del repo, clonarlo
# ═══════════════════════════════════════════════════════════════════
if [ -f "package.json" ] && grep -q "botmare-unified" package.json 2>/dev/null; then
    WORK_DIR="$(pwd)"
    info "Repositorio BotMaRe detectado en: ${BOLD}${WORK_DIR}${NC}"
else
    step 0 "Clonando repositorio BotMaRe..."

    if ! command -v git &>/dev/null; then
        fail "Git no está instalado. Instálalo primero:"
        echo -e "  ${CYAN}sudo apt install git${NC}  (Debian/Ubuntu)"
        echo -e "  ${CYAN}sudo yum install git${NC}  (CentOS/RHEL)"
        exit 1
    fi

    if [ -d "$INSTALL_DIR" ]; then
        warn "La carpeta '$INSTALL_DIR' ya existe."
        ask_yn "  ¿Deseas usarla de todas formas? (s/n): " "s" USE_EXISTING

        if [[ "$USE_EXISTING" =~ ^[Ss]$ ]]; then
            cd "$INSTALL_DIR"
        else
            fail "Abortado. Renombra o elimina la carpeta '$INSTALL_DIR' e intenta de nuevo."
            exit 1
        fi
    else
        info "Clonando desde ${REPO_URL}..."
        git clone "$REPO_URL" "$INSTALL_DIR"
        cd "$INSTALL_DIR"
    fi

    WORK_DIR="$(pwd)"
    ok "Repositorio clonado en: ${BOLD}${WORK_DIR}${NC}"
fi

echo ""
info "Directorio de trabajo: ${BOLD}${WORK_DIR}${NC}"

# ═══════════════════════════════════════════════════════════════════
# PASO 1: Verificar / Instalar Dependencias del Sistema
# ═══════════════════════════════════════════════════════════════════
step 1 "Verificando dependencias del sistema operativo..."

install_system_deps() {
    case "$OS" in
        debian)
            info "Distribución basada en Debian/Ubuntu detectada."
            info "Instalando build-essential, python3, make, g++, git, curl..."
            sudo apt-get update -qq
            sudo apt-get install -y build-essential python3 make g++ git curl -qq
            ok "Dependencias del sistema instaladas."
            ;;
        rhel)
            info "Distribución basada en RHEL/CentOS detectada."
            sudo yum groupinstall -y "Development Tools" -q
            sudo yum install -y python3 git curl -q
            ok "Dependencias del sistema instaladas."
            ;;
        arch)
            info "Distribución Arch Linux detectada."
            sudo pacman -Syu --noconfirm base-devel python git curl
            ok "Dependencias del sistema instaladas."
            ;;
        macos)
            info "macOS detectado."
            if ! command -v xcode-select &>/dev/null || ! xcode-select -p &>/dev/null; then
                info "Instalando Xcode Command Line Tools..."
                xcode-select --install 2>/dev/null || true
                warn "Si se abrió un diálogo, acepta la instalación y re-ejecuta este script."
            fi
            ok "Herramientas de compilación disponibles."
            ;;
        *)
            warn "Sistema operativo no reconocido automáticamente."
            warn "Asegúrate de tener instalado: build-essential, python3, make, g++, git, curl."
            ;;
    esac
}

# Solo intentar instalar dependencias de sistema si falta alguna herramienta clave
NEEDS_DEPS=false
for cmd in git curl make g++; do
    if ! command -v "$cmd" &>/dev/null; then
        NEEDS_DEPS=true
        break
    fi
done

if $NEEDS_DEPS; then
    warn "Faltan dependencias del sistema. Intentando instalar..."
    install_system_deps
else
    ok "Todas las dependencias del sistema ya están presentes."
fi

# ═══════════════════════════════════════════════════════════════════
# PASO 2: Verificar Node.js
# ═══════════════════════════════════════════════════════════════════
step 2 "Verificando Node.js..."

if ! command -v node &>/dev/null; then
    fail "Node.js NO está instalado."
    echo ""
    echo -e "${YELLOW}  BotMaRe requiere Node.js v20 o superior.${NC}"
    echo ""

    if [[ "$OS" == "debian" ]]; then
        echo -e "  ${BOLD}Opción recomendada (NodeSource):${NC}"
        echo -e "    ${CYAN}curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -${NC}"
        echo -e "    ${CYAN}sudo apt-get install -y nodejs${NC}"
    elif [[ "$OS" == "macos" ]]; then
        echo -e "  ${BOLD}Opción recomendada (Homebrew):${NC}"
        echo -e "    ${CYAN}brew install node@20${NC}"
    fi
    echo ""
    echo -e "  ${BOLD}Opción universal (nvm):${NC}"
    echo -e "    ${CYAN}curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash${NC}"
    echo -e "    ${CYAN}nvm install 20${NC}"
    echo ""

    # En modo automático, intentar instalar automáticamente
    INSTALL_NODE="n"
    if $INTERACTIVE; then
        ask_yn "  ¿Deseas que intentemos instalar Node.js 20 automáticamente? (s/n): " "s" INSTALL_NODE
    else
        INSTALL_NODE="s"
        info "Modo automático: intentando instalar Node.js 20..."
    fi

    if [[ "$INSTALL_NODE" =~ ^[Ss]$ ]]; then
        if [[ "$OS" == "debian" ]]; then
            curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
            sudo apt-get install -y nodejs
        elif [[ "$OS" == "macos" ]]; then
            if command -v brew &>/dev/null; then
                brew install node@20
            else
                fail "Homebrew no está instalado. Instala Node.js manualmente."
                exit 1
            fi
        else
            fail "Instalación automática no soportada para tu sistema."
            fail "Instala Node.js v20+ manualmente desde https://nodejs.org/"
            exit 1
        fi
    else
        fail "Node.js es requerido. Instálalo y vuelve a ejecutar este script."
        exit 1
    fi
fi

NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
if ! [[ "$NODE_VERSION" =~ ^[0-9]+$ ]]; then
    fail "No se pudo determinar la versión de Node.js de forma segura. Detectado: '$NODE_VERSION'"
    exit 1
fi

if [ "$NODE_VERSION" -lt 18 ]; then
    fail "Node.js v$NODE_VERSION detectado. Se requiere v18 o superior (v20 recomendado)."
    exit 1
fi

ok "Node.js $(node -v) detectado."

# ═══════════════════════════════════════════════════════════════════
# PASO 3: Instalar pnpm y PM2 globalmente
# ═══════════════════════════════════════════════════════════════════
step 3 "Instalando gestores de paquetes y procesos..."

if ! command -v pnpm &>/dev/null; then
    info "Instalando pnpm (gestor de paquetes ultra-rápido)..."
    npm install -g pnpm
    ok "pnpm instalado."
else
    ok "pnpm $(pnpm -v) ya disponible."
fi

if ! command -v pm2 &>/dev/null; then
    info "Instalando PM2 (gestor de procesos para producción)..."
    npm install -g pm2
    ok "PM2 instalado."
else
    ok "PM2 $(pm2 -v) ya disponible."
fi

# ═══════════════════════════════════════════════════════════════════
# PASO 4: Instalar dependencias del proyecto
# ═══════════════════════════════════════════════════════════════════
step 4 "Instalando dependencias del proyecto (pnpm install)..."

pnpm config set ignore-scripts false
info "Ejecutando pnpm install (esto puede tomar unos minutos)..."
pnpm install

if [ $? -eq 0 ]; then
    ok "Todas las dependencias instaladas correctamente."
else
    fail "Error al instalar dependencias."
    warn "Intenta ejecutar: pnpm rebuild better-sqlite3"
    exit 1
fi

# ═══════════════════════════════════════════════════════════════════
# PASO 5: Configurar archivo .env
# ═══════════════════════════════════════════════════════════════════
step 5 "Configurando variables de entorno (.env)..."

if [ ! -f ".env" ]; then
    echo ""
    ask_yn "  ¿Deseas usar el Asistente Web visual para configurar (s), o hacerlo por Terminal (n)? (s/n): " "s" USE_WEB_SETUP

    if [[ "$USE_WEB_SETUP" =~ ^[Ss]$ ]]; then
        info "La configuración inicial se realizará visualmente desde el navegador."
        info "Al iniciar el bot por primera vez, se levantará el Asistente Web."
        USER_PORT="8000"
    else
        info "Creando archivo .env desde plantilla..."
        cp .env.example .env

        # Preguntar puerto
        echo ""
        ask "  ¿En qué puerto deseas ejecutar BotMaRe? (Enter = 8000): " "8000" USER_PORT

        # Aplicar puerto al .env (compatible con macOS y Linux)
        if [[ "$OS" == "macos" ]]; then
            sed -i '' "s/PORT=8000/PORT=${USER_PORT}/" .env
            sed -i '' "s/localhost:8000/localhost:${USER_PORT}/" .env
        else
            sed -i "s/PORT=8000/PORT=${USER_PORT}/" .env
            sed -i "s/localhost:8000/localhost:${USER_PORT}/" .env
        fi

        ok "Archivo .env creado con puerto ${USER_PORT}."
        echo ""
        echo -e "${YELLOW}  ╔════════════════════════════════════════════════════════╗${NC}"
        echo -e "${YELLOW}  ║  ${BOLD}¡IMPORTANTE!${NC}${YELLOW} Abre el archivo .env y configura:        ║${NC}"
        echo -e "${YELLOW}  ║                                                        ║${NC}"
        echo -e "${YELLOW}  ║  • DASHBOARD_USER / DASHBOARD_PASS (seguridad web)     ║${NC}"
        echo -e "${YELLOW}  ║  • Al menos 1 API Key de IA (GEMINI, OPENAI, etc.)     ║${NC}"
        echo -e "${YELLOW}  ║  • TELEGRAM_BOT_TOKEN (opcional, para control remoto)  ║${NC}"
        echo -e "${YELLOW}  ╚════════════════════════════════════════════════════════╝${NC}"
    fi
else
    ok "Archivo .env ya existe. Respetando configuración actual."
    # Leer el puerto actual del .env existente
    USER_PORT=$(grep -m1 '^PORT=' .env 2>/dev/null | cut -d= -f2 || echo "8000")
    USER_PORT=${USER_PORT:-8000}
fi

# ═══════════════════════════════════════════════════════════════════
# PASO 6: Configurar memoria Swap (Solo Linux, opcional)
# ═══════════════════════════════════════════════════════════════════
step 6 "Verificando memoria del sistema..."

if [[ "$OS" != "macos" ]] && [[ "$OS" != "unknown" ]]; then
    TOTAL_RAM_MB=$(free -m 2>/dev/null | awk '/^Mem:/{print $2}' || echo "0")
    SWAP_SIZE=$(free -m 2>/dev/null | awk '/^Swap:/{print $2}' || echo "0")

    if [ "$TOTAL_RAM_MB" -gt 0 ] 2>/dev/null; then
        info "RAM total del sistema: ${BOLD}${TOTAL_RAM_MB} MB${NC}"
        info "Swap actual:           ${BOLD}${SWAP_SIZE} MB${NC}"

        if [ "$TOTAL_RAM_MB" -le 1500 ] && [ "$SWAP_SIZE" -le 512 ]; then
            echo ""
            warn "Tu servidor tiene poca RAM (${TOTAL_RAM_MB} MB) y poco Swap."
            warn "Next.js puede fallar durante la compilación sin memoria suficiente."
            echo ""

            ask_yn "  ¿Deseas crear un archivo Swap de 2 GB? (s/n): " "s" CREATE_SWAP

            if [[ "$CREATE_SWAP" =~ ^[Ss]$ ]]; then
                if [ -f "/swapfile" ]; then
                    warn "Ya existe un /swapfile. Saltando creación."
                else
                    info "Creando archivo Swap de 2 GB..."
                    if sudo fallocate -l 2G /swapfile 2>/dev/null; then
                        sudo chmod 600 /swapfile
                        sudo mkswap /swapfile
                        sudo swapon /swapfile
                        ok "Swap de 2 GB creado con fallocate."
                    else
                        info "fallocate falló, intentando con dd (esto puede tardar unos segundos)..."
                        sudo dd if=/dev/zero of=/swapfile bs=1M count=2048 status=progress
                        sudo chmod 600 /swapfile
                        sudo mkswap /swapfile
                        sudo swapon /swapfile
                        ok "Swap de 2 GB creado con dd."
                    fi

                    # Hacer permanente
                    if ! grep -q '/swapfile' /etc/fstab; then
                        echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab >/dev/null
                    fi

                    ok "Swap de 2 GB activado permanentemente."
                fi
            else
                info "Swap no creado. Puedes hacerlo manualmente si lo necesitas."
            fi
        else
            ok "Memoria suficiente para la compilación."
        fi
    else
        info "No se pudo detectar la RAM del sistema (entorno sin 'free')."
    fi
else
    ok "macOS detectado, gestión de memoria automática del sistema."
fi

# ═══════════════════════════════════════════════════════════════════
# PASO 7: Compilar Frontend (Build)
# ═══════════════════════════════════════════════════════════════════
step 7 "Compilando interfaz del Dashboard (Next.js)..."

echo ""
ask_yn "  ¿Deseas compilar el frontend ahora? (s/n, recomendado: s): " "s" DO_BUILD

if [[ "$DO_BUILD" =~ ^[Ss]$ ]]; then
    info "Ejecutando pnpm run build..."
    if pnpm run build; then
        ok "Dashboard compilado exitosamente. Carpeta 'out/' generada."
    else
        fail "Error durante la compilación del Dashboard."
        warn "Puedes intentarlo manualmente con: pnpm run build"
    fi
else
    warn "Build omitido. Recuerda ejecutar 'pnpm run build' antes de iniciar en producción."
fi

# ═══════════════════════════════════════════════════════════════════
#                     RESUMEN FINAL
# ═══════════════════════════════════════════════════════════════════
echo ""
divider
banner "          ✅ INSTALACIÓN COMPLETADA CON ÉXITO"
divider
echo ""
echo -e "${BOLD}  📝 SIGUIENTES PASOS:${NC}"
echo ""
echo -e "  ${CYAN}1.${NC} Edita el archivo ${BOLD}.env${NC} con tus claves de API de IA."
echo -e "     ${CYAN}cd ${WORK_DIR} && nano .env${NC}"
echo ""
echo -e "  ${CYAN}2.${NC} Inicia el bot en el modo que prefieras:"
echo ""
echo -e "     ${GREEN}▸ Modo Desarrollo:${NC}        pnpm run dev"
echo -e "     ${GREEN}▸ Modo Producción:${NC}        pnpm run start"
echo -e "     ${GREEN}▸ Modo Producción 24/7:${NC}   pnpm run pm2:start"
echo ""
echo -e "  ${CYAN}3.${NC} Abre tu navegador en ${BOLD}http://localhost:${USER_PORT}${NC}"
echo -e "     Escanea el código QR desde WhatsApp > Dispositivos vinculados."
echo ""
echo -e "  ${CYAN}4.${NC} Comandos útiles de PM2:"
echo -e "     ${CYAN}pnpm run pm2:logs${NC}      → Ver logs en tiempo real"
echo -e "     ${CYAN}pnpm run pm2:stop${NC}      → Detener el bot"
echo -e "     ${CYAN}pnpm run pm2:restart${NC}   → Reiniciar el bot"
echo -e "     ${CYAN}pnpm run pm2:monit${NC}     → Monitor de recursos"
echo ""
divider
echo ""

# Preguntar si desea iniciar ahora (solo en modo interactivo)
if $INTERACTIVE; then
    ask_yn "  ¿Deseas iniciar BotMaRe ahora? (s/n): " "n" START_NOW

    if [[ "$START_NOW" =~ ^[Ss]$ ]]; then
        echo ""
        echo -e "  ${BOLD}Selecciona el modo de inicio:${NC}"
        echo -e "  ${CYAN}1.${NC} Modo Desarrollo (dev)"
        echo -e "  ${CYAN}2.${NC} Modo Producción (start)"
        echo -e "  ${CYAN}3.${NC} Modo PM2 24/7 (pm2:start)"
        echo ""
        ask "  Opción (1/2/3): " "3" START_MODE

        case "$START_MODE" in
            1) exec pnpm run dev ;;
            2) exec pnpm run start ;;
            3) pnpm run pm2:start
               echo ""
               ok "BotMaRe iniciado con PM2 en segundo plano."
               echo -e "  Ejecuta ${CYAN}pnpm run pm2:logs${NC} para ver la actividad."
               ;;
            *) warn "Opción no válida. Puedes iniciar manualmente." ;;
        esac
    fi
else
    info "Modo automático finalizado. Entra al directorio e inicia:"
    echo -e "  ${CYAN}cd ${WORK_DIR}${NC}"
    echo -e "  ${CYAN}nano .env${NC}              # Configura tus API Keys"
    echo -e "  ${CYAN}pnpm run pm2:start${NC}     # Inicia en producción 24/7"
fi

echo ""
echo -e "${BOLD}  🦊 ¡Gracias por usar BotMaRe AI!${NC}"
echo ""
