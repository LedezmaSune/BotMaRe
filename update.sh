#!/usr/bin/env bash

# ═══════════════════════════════════════════════════════════════════
#  🦊 BotMaRe AI - Script de Actualización Inteligente y Seguro
#  Versión: 2.0  •  2026
#
#  Mantiene tu bot al día sincronizándolo con el repositorio,
#  asegurando tus bases de datos, llaves de sesión y variables.
# ═══════════════════════════════════════════════════════════════════

# ── Colores y estilos ──────────────────────────────────────────────
BOLD='\033[1m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

info()    { echo -e "${CYAN}  ℹ ${NC}$1"; }
ok()      { echo -e "${GREEN}  ✓ ${NC}$1"; }
warn()    { echo -e "${YELLOW}  ⚠ ${NC}$1"; }
fail()    { echo -e "${RED}  ✗ ${NC}$1"; }
banner()  { echo -e "${BLUE}${BOLD}$1${NC}"; }
step()    { echo -e "\n${MAGENTA}${BOLD}[$1/5]${NC} ${BOLD}$2${NC}"; }
divider() { echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"; }

clear 2>/dev/null || true
divider
banner "          🦊 BOTMARE AI - ACTUALIZADOR INTELIGENTE 🦊"
banner "          Mantén tu sistema al día con total seguridad"
divider
echo ""

# 1. Verificar si estamos en un repositorio Git
if [ ! -d ".git" ]; then
    fail "Error: No se detectó un repositorio Git activo. Este script requiere Git."
    exit 1
fi

# 2. Respaldo de seguridad preventivo
step 1 "Creando respaldo de seguridad preventivo..."
BACKUP_DIR="backups/pre-update-$(date +%F_%H-%M-%S)"
mkdir -p "$BACKUP_DIR"

# Respaldar base de datos del sistema
if [ -f "data/database.db" ]; then
    cp "data/database.db" "$BACKUP_DIR/" 2>/dev/null
    info "Base de datos del sistema respaldada."
else
    warn "No se encontró base de datos del sistema (database.db) para respaldar."
fi

# Respaldar sesiones activas de WhatsApp
if [ -f "data/whatsapp_auth.db" ]; then
    cp "data/whatsapp_auth.db" "$BACKUP_DIR/" 2>/dev/null
    info "Sesiones de WhatsApp (whatsapp_auth.db) respaldadas."
else
    info "No hay sesiones activas de WhatsApp para respaldar."
fi

# Respaldar variables de entorno
if [ -f ".env" ]; then
    cp ".env" "$BACKUP_DIR/" 2>/dev/null
    info "Archivo de configuración (.env) respaldado."
fi

ok "Respaldo preventivo guardado en: ${BOLD}${BACKUP_DIR}/${NC}"

# 3. Descargar cambios de GitHub
step 2 "Sincronizando código con GitHub..."
info "Limpiando posibles conflictos de código local..."
git reset --hard HEAD
info "Trayendo actualizaciones desde la rama principal..."
git pull origin main

if [ $? -ne 0 ]; then
    fail "Error al descargar las actualizaciones de GitHub."
    warn "Por favor verifica tu conexión a Internet o los permisos del repositorio."
    exit 1
fi
ok "Código fuente actualizado exitosamente."

# 4. Instalar y actualizar dependencias
step 3 "Actualizando librerías del sistema (pnpm install)..."
if ! command -v pnpm &>/dev/null; then
    warn "pnpm no está instalado. Intentando usar npm..."
    npm install
else
    pnpm install
fi

if [ $? -ne 0 ]; then
    fail "Fallo al instalar las dependencias."
    warn "Intenta ejecutar manualmente 'pnpm install' para ver el error completo."
    exit 1
fi
ok "Librerías y dependencias actualizadas."

# 5. Reconstruir Dashboard
step 4 "Reconstruyendo interfaz visual del Dashboard (Next.js)..."
if ! command -v pnpm &>/dev/null; then
    npm run build
else
    pnpm run build
fi

if [ $? -ne 0 ]; then
    fail "Error al compilar el Dashboard."
    warn "Puedes intentar compilarlo manualmente ejecutando: pnpm run build"
    exit 1
fi
ok "Dashboard reconstruido de forma exitosa."

# 6. Reiniciar / Finalizar
step 5 "Preparando finalización..."
divider
banner "          ✅ ACTUALIZACIÓN COMPLETADA CON ÉXITO"
divider
echo ""
info "Tu sistema ahora se encuentra en la versión más reciente."
echo ""

# Menú interactivo para iniciar/reiniciar
echo -e "${BOLD}¿Cómo deseas arrancar el bot ahora?${NC}"
echo -e "  ${CYAN}1.${NC} Iniciar en primer plano - Modo Desarrollo (${BOLD}pnpm run dev${NC})"
echo -e "  ${CYAN}2.${NC} Iniciar en primer plano - Modo Producción (${BOLD}pnpm run start${NC})"
echo -e "  ${CYAN}3.${NC} Reiniciar en segundo plano - Modo PM2 (${BOLD}pnpm run pm2:restart${NC})"
echo -e "  ${CYAN}4.${NC} Salir sin iniciar"
echo ""

read -p "Elige una opción (1-4): " -n 1 -r START_MODE
echo ""
echo ""

case "$START_MODE" in
    1)
        info "Iniciando en Modo Desarrollo..."
        if command -v pnpm &>/dev/null; then
            exec pnpm run dev
        else
            exec npm run dev
        fi
        ;;
    2)
        info "Iniciando en Modo Producción..."
        if command -v pnpm &>/dev/null; then
            exec pnpm run start
        else
            exec npm run start
        fi
        ;;
    3)
        info "Reiniciando proceso en segundo plano con PM2..."
        if command -v pm2 &>/dev/null; then
            if pm2 describe BotMaRe-Unified &>/dev/null; then
                pm2 restart BotMaRe-Unified
            else
                if command -v pnpm &>/dev/null; then
                    pnpm run pm2:start
                else
                    npm run pm2:start
                fi
            fi
            ok "BotMaRe reiniciado con PM2 de forma exitosa."
            info "Puedes ver la consola ejecutando: ${BOLD}pnpm run pm2:logs${NC}"
        else
            fail "PM2 no está instalado globalmente. No se pudo reiniciar."
            warn "Inicia manualmente usando pnpm run start."
        fi
        ;;
    *)
        ok "Actualización terminada. Puedes iniciar el bot de forma manual cuando gustes."
        ;;
esac

echo ""
