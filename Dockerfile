# ═══════════════════════════════════════════════════════════════════
#  STAGE 1: Compilación de Assets y Dashboard (Builder)
# ═══════════════════════════════════════════════════════════════════
FROM node:26-alpine AS builder

WORKDIR /app

# Herramientas nativas para compilación de dependencias (better-sqlite3)
RUN apk add --no-cache python3 make g++
RUN corepack enable

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

# Compilar exportación estática de Next.js (genera carpeta /app/out)
RUN pnpm run build

# ═══════════════════════════════════════════════════════════════════
#  STAGE 2: Dependencias de Producción (Prod-Deps)
# ═══════════════════════════════════════════════════════════════════
FROM node:26-alpine AS prod-deps

WORKDIR /app

RUN apk add --no-cache python3 make g++
RUN corepack enable

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile

# ═══════════════════════════════════════════════════════════════════
#  STAGE 3: Imagen Final Segura y No Privilegiada (Runner)
# ═══════════════════════════════════════════════════════════════════
FROM node:26-alpine AS runner

WORKDIR /app

# Solo curl para comprobación de salud del contenedor; sin compiladores ni toolchain
RUN apk add --no-cache curl
RUN corepack enable

ENV NODE_ENV=production

# Copiar dependencias de producción limpias
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=prod-deps /app/package.json ./

# Copiar aplicación, estáticos y plugins versionados
COPY --from=builder /app/out ./out
COPY --from=builder /app/src ./src
COPY --from=builder /app/bin ./bin
COPY --from=builder /app/data/plugins ./data/plugins

# Crear directorios de persistencia con permisos para usuario node
RUN mkdir -p data backups && chown -R node:node /app

# Ejecución bajo usuario no-root
USER node

EXPOSE 8000

# Verificación de salud contra endpoint público /healthz
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -fs http://localhost:8000/healthz || exit 1

CMD ["pnpm", "run", "start"]
