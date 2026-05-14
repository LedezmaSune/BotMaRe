#!/bin/bash

# 🦊 BotMaRe AI - Script de Actualización Universal
# Diseñado para mantener tu bot al día de forma segura.

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m' # No Color

echo -e "${BLUE}${BOLD}=======================================================${NC}"
echo -e "${BLUE}${BOLD}      🦊 INICIANDO ACTUALIZACIÓN DE BOTMARE AI         ${NC}"
echo -e "${BLUE}${BOLD}=======================================================${NC}"

# 1. Verificar si estamos en un repositorio Git
if [ ! -d ".git" ]; then
    echo -e "${RED}[!] Error: No se detectó un repositorio Git. Abortando.${NC}"
    exit 1
fi

# 2. Respaldo de seguridad preventivo
echo -e "${YELLOW}[1/5] Creando respaldo de seguridad de tus datos...${NC}"
mkdir -p backups/pre-update
cp -r data/database.db backups/pre-update/ 2>/dev/null
cp .env backups/pre-update/ 2>/dev/null
echo -e "${GREEN}  ✓ Respaldo guardado en backups/pre-update/${NC}"

# 3. Bajar cambios de GitHub
echo -e "${YELLOW}[2/5] Sincronizando con GitHub...${NC}"
git reset --hard HEAD # Limpiar cambios locales no guardados en código
git pull origin main
if [ $? -ne 0 ]; then
    echo -e "${RED}[!] Error al descargar cambios. Revisa tu conexión o permisos.${NC}"
    exit 1
fi
echo -e "${GREEN}  ✓ Código actualizado.${NC}"

# 4. Instalar dependencias
echo -e "${YELLOW}[3/5] Actualizando librerías (pnpm install)...${NC}"
pnpm install --quiet
echo -e "${GREEN}  ✓ Librerías al día.${NC}"

# 5. Reconstruir Dashboard (Crítico para ver cambios visuales)
echo -e "${YELLOW}[4/5] Reconstruyendo interfaz visual (Build)...${NC}"
pnpm run build
if [ $? -ne 0 ]; then
    echo -e "${RED}[!] Error en la construcción del Dashboard.${NC}"
    exit 1
fi
echo -e "${GREEN}  ✓ Dashboard reconstruido con éxito.${NC}"

# 6. Reiniciar
echo -e "${YELLOW}[5/5] Preparando reinicio...${NC}"
echo -e "${BLUE}${BOLD}=======================================================${NC}"
echo -e "${GREEN}${BOLD}      ✅ ACTUALIZACIÓN COMPLETADA CON ÉXITO            ${NC}"
echo -e "${BLUE}${BOLD}=======================================================${NC}"

echo -e "${YELLOW}¿Deseas iniciar el bot ahora? (s/n)${NC}"
read -n 1 -r
echo
if [[ $REPLY =~ ^[Ss]$ ]]; then
    npm start
fi
