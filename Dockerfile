# 🦊 BotMaRe Unified Dockerfile
FROM node:20-slim AS builder

WORKDIR /app

# Instalar dependencias necesarias para better-sqlite3 y compilación nativa
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Instalar pnpm globalmente para mantener consistencia con el ecosistema del proyecto
RUN npm install -g pnpm

# Copiar archivos de dependencias y lockfile de pnpm
COPY package.json pnpm-lock.yaml* ./

# Instalar TODAS las dependencias respetando el lockfile para consistencia absoluta
RUN pnpm install --frozen-lockfile

# Copiar el resto del código fuente
COPY . .

# Compilar el Frontend y el Servidor utilizando Webpack (estabilidad garantizada)
RUN pnpm run build

# --- ETAPA DE PRODUCCIÓN ---
FROM node:20-slim

WORKDIR /app

# Instalar herramientas necesarias para ejecución (pnpm y tsx)
RUN npm install -g pnpm tsx

# Copiar solo los artefactos y archivos necesarios de la etapa anterior
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-lock.yaml* ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/out ./out
COPY --from=builder /app/src ./src
COPY --from=builder /app/bin ./bin
COPY --from=builder /app/.env.example ./.env.example

# Exponer el puerto del Monolito
EXPOSE 8000

# Comando de arranque nativo usando tsx
CMD ["tsx", "src/server.ts"]
