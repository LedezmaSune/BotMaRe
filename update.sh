#!/usr/bin/env bash

# ═══════════════════════════════════════════════════════════════════
#  🦊 BotMaRe AI - Script de Actualización Inteligente y Seguro
#  Versión: 2.7.0 (sincronizada con package.json)  •  2026
#
#  Mantiene tu bot al día sincronizándolo con el repositorio,
#  asegurando tus bases de datos, llaves de sesión y variables.
# ═══════════════════════════════════════════════════════════════════

set -Eeuo pipefail

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

# Trampa para detectar interrupciones o fallos no capturados
cleanup_on_error() {
    local exit_code=$?
    if [ $exit_code -ne 0 ]; then
        echo ""
        fail "La actualización ha sido cancelada o falló inesperadamente (Código de salida: $exit_code)."
        warn "Revisa los mensajes anteriores para más detalles."
    fi
}
trap cleanup_on_error EXIT

clear 2>/dev/null || true
divider
banner "          🦊 BOTMARE AI - ACTUALIZADOR INTELIGENTE 🦊"
banner "          Mantén tu sistema al día con total seguridad"
divider
echo ""

detect_os() {
    OS="unknown"
    if [ -d "/data/data/com.termux" ]; then
        OS="termux"
    elif [[ "${OSTYPE:-linux}" == "linux-gnu"* ]] || [ -f /etc/os-release ]; then
        OS="linux"
    elif [[ "${OSTYPE:-}" == "darwin"* ]]; then
        OS="macos"
    fi
}
detect_os

# 1. Verificar si estamos en un repositorio Git
if [ ! -d ".git" ]; then
    fail "Error: No se detectó un repositorio Git activo. Este script requiere Git."
    exit 1
fi

# 2. Respaldo de seguridad preventivo
step 1 "Creando respaldo de seguridad preventivo..."
BACKUP_DIR="backups/pre-update-$(date +%F_%H-%M-%S)"
mkdir -p "$BACKUP_DIR"

# Respaldar carpeta data completa en un archivo comprimido
if [ -d "data" ]; then
    if tar -czf "$BACKUP_DIR/data_backup.tar.gz" data/ 2>/dev/null; then
        info "Carpeta de datos completa respaldada en data_backup.tar.gz."
    else
        warn "No se pudo comprimir la carpeta 'data', creando copia de directorio..."
        cp -r data/ "$BACKUP_DIR/data_raw/" 2>/dev/null || true
    fi
else
    warn "No se encontró la carpeta 'data' para respaldar."
fi

# Respaldar variables de entorno
if [ -f ".env" ]; then
    cp ".env" "$BACKUP_DIR/" 2>/dev/null || true
    info "Archivo de configuración (.env) respaldado."
fi

ok "Respaldo preventivo guardado en: ${BOLD}${BACKUP_DIR}/${NC}"

# 3. Descargar cambios de GitHub
step 2 "Sincronizando código con GitHub..."
info "Protegiendo cambios locales antes de actualizar..."

HAS_STASH=false
STASH_RESULT=$(git stash save "Auto-stash por update.sh $(date +%s)" 2>&1 || true)
if [[ "$STASH_RESULT" != *"No local changes to save"* && "$STASH_RESULT" != *"No hay cambios locales"* && "$STASH_RESULT" != *"No local changes"* ]]; then
    warn "Se detectaron cambios locales. Se han guardado temporalmente en 'git stash'."
    HAS_STASH=true
fi

info "Trayendo actualizaciones desde la rama principal..."
if ! git pull --rebase origin main; then
    fail "Error al descargar las actualizaciones de GitHub."
    warn "Intentando restaurar el estado anterior..."
    git rebase --abort 2>/dev/null || true
    if [ "$HAS_STASH" = true ]; then
        git stash pop 2>/dev/null || true
    fi
    exit 1
fi

if [ "$HAS_STASH" = true ]; then
    info "Restaurando tus cambios locales..."
    if ! git stash pop; then
        warn "Hubo conflictos al aplicar tus cambios locales."
        warn "Por favor resuelve los conflictos de Git manualmente."
    fi
fi
ok "Código fuente actualizado exitosamente."

# 4. Instalar y actualizar dependencias
step 3 "Actualizando librerías del sistema (pnpm install)..."
if ! command -v pnpm &>/dev/null; then
    fail "pnpm no está instalado. Ejecuta 'npm install -g pnpm' primero."
    exit 1
fi

if ! pnpm install; then
    fail "Fallo al instalar las dependencias."
    warn "Intenta ejecutar manualmente 'pnpm install' para ver el error completo."
    exit 1
fi
ok "Librerías y dependencias actualizadas."

# 5. Reconstruir Dashboard
step 4 "Reconstruyendo interfaz visual del Dashboard (Next.js)..."

if [[ "$OS" != "macos" ]] && [[ "$OS" != "termux" ]]; then
    TOTAL_RAM_MB=$(free -m 2>/dev/null | awk '/^Mem:/{print $2}' || echo "0")
    SWAP_SIZE=$(free -m 2>/dev/null | awk '/^Swap:/{print $2}' || echo "0")

    if [ "$TOTAL_RAM_MB" -gt 0 ] 2>/dev/null; then
        if [ "$TOTAL_RAM_MB" -le 1500 ] && [ "$SWAP_SIZE" -le 512 ]; then
            warn "Tu servidor tiene poca RAM (${TOTAL_RAM_MB} MB) y poco Swap (${SWAP_SIZE} MB)."
            warn "Next.js puede requerir más memoria para compilar."
            read -p "  ¿Deseas crear un archivo Swap de 2 GB? (s/n): " -n 1 -r CREATE_SWAP
            echo ""
            if [[ "$CREATE_SWAP" =~ ^[Ss]$ ]]; then
                if [ -f "/swapfile" ]; then
                    warn "Ya existe un /swapfile en el sistema."
                else
                    info "Creando archivo Swap de 2 GB..."
                    if sudo fallocate -l 2G /swapfile 2>/dev/null; then
                        sudo chmod 600 /swapfile
                        sudo mkswap /swapfile
                        sudo swapon /swapfile
                        ok "Swap de 2 GB creado con fallocate."
                    else
                        info "fallocate no disponible, intentando con dd..."
                        sudo dd if=/dev/zero of=/swapfile bs=1M count=2048 status=progress 2>/dev/null || true
                        sudo chmod 600 /swapfile
                        sudo mkswap /swapfile
                        sudo swapon /swapfile
                        ok "Swap de 2 GB creado con dd."
                    fi
                    if ! grep -q '/swapfile' /etc/fstab 2>/dev/null; then
                        echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab >/dev/null || true
                    fi
                fi
            fi
        fi
    fi
fi

if ! pnpm run build; then
    fail "Error al compilar la aplicación con Next.js."
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
info "Tu sistema ahora se encuentra en la versión más reciente (v2.5.0)."
echo ""

# Desactivar el trap al llegar al final exitosamente
trap - EXIT

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
        exec pnpm run dev
        ;;
    2)
        info "Iniciando en Modo Producción..."
        exec pnpm run start
        ;;
    3)
        info "Reiniciando proceso en segundo plano con PM2..."
        if command -v pm2 &>/dev/null || pnpm exec pm2 -v &>/dev/null; then
            if pnpm run pm2:restart 2>/dev/null; then
                ok "BotMaRe reiniciado con PM2 de forma exitosa."
            else
                info "Iniciando proceso en PM2 por primera vez..."
                pnpm run pm2:start
                ok "BotMaRe iniciado con PM2."
            fi
            info "Puedes ver la consola ejecutando: ${BOLD}pnpm run pm2:logs${NC}"
        else
            fail "PM2 no está disponible en tu sistema."
            warn "Puedes iniciar manualmente usando: pnpm run start"
        fi
        ;;
    *)
        ok "Actualización terminada. Puedes iniciar el bot manualmente cuando gustes."
        ;;
esac

echo ""

