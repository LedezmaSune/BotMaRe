# ═══════════════════════════════════════════════════════════════════
#  STAGE 1: Compilación y dependencias (Builder)
# ═══════════════════════════════════════════════════════════════════
FROM node:20-alpine AS builder

WORKDIR /app

# Herramientas de compilación para módulos nativos (better-sqlite3)
RUN apk add --no-cache python3 make g++

# Habilitar Corepack para usar pnpm
RUN corepack enable

# Copiar manifiesto y lockfile para instalación determinista
COPY package.json pnpm-lock.yaml ./

# Instalación estricta sin fallback permisivo
RUN pnpm install --frozen-lockfile

# Copiar código fuente
COPY . .

# Compilar Next.js Dashboard
RUN pnpm run build

# ═══════════════════════════════════════════════════════════════════
#  STAGE 2: Imagen Final Segura de Producción (Runner)
# ═══════════════════════════════════════════════════════════════════
FROM node:20-alpine AS runner

WORKDIR /app

# Instalar curl únicamente para el healthcheck
RUN apk add --no-cache curl

RUN corepack enable

ENV NODE_ENV=production

# Copiar aplicación construida desde el stage anterior
COPY --from=builder /app ./

# Asegurar permisos de escritura para usuario node en directorios de persistencia
RUN mkdir -p data backups out .next && chown -R node:node /app

# Ejecutar como usuario no privilegiado (no-root)
USER node

# Puerto del servidor BotMaRe
EXPOSE 8000

# Verificación de salud del contenedor
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -fs http://localhost:8000/healthz || exit 1

# Comando de arranque
CMD ["pnpm", "run", "start"]
