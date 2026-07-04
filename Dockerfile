# Base image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install build tools and python for better-sqlite3
RUN apk add --no-cache python3 make g++

# Enable Corepack to use pnpm
RUN corepack enable

# Copy package.json and pnpm-lock.yaml (if exists)
COPY package.json pnpm-lock.yaml* ./

# Install dependencies
RUN pnpm install --frozen-lockfile || pnpm install

# Copy all source files
COPY . .

# Build the Next.js UI
RUN pnpm run build

# Expose the ports (Next.js Dashboard and Express API)
EXPOSE 3000
EXPOSE 8000

# Set environment variables for production
ENV NODE_ENV=production

# Start both Next.js UI and the Backend Engine
# Note: We use concurrently directly via pnpm run dev for simplicity, 
# or pnpm run start if we want to run the production build.
CMD ["pnpm", "run", "start"]
