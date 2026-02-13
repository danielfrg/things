# Stage 1: Build web package
FROM oven/bun:1.3 AS builder

# Install build tools needed for native modules (better-sqlite3)
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ARG APP_VERSION=dev

# Copy package files first for better caching
COPY package.json bun.lock ./
COPY packages/server/package.json ./packages/server/
COPY packages/sdk/package.json ./packages/sdk/
COPY packages/web/package.json ./packages/web/

# Install dependencies
RUN bun install

# Copy source code
COPY . .

ENV APP_VERSION=$APP_VERSION
RUN bun run build:web

# Stage 2: Production server
FROM oven/bun:1.3-slim AS production

# Install tini for proper signal handling
RUN apt-get update && apt-get install -y tini && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy node_modules from builder to avoid needing native build tools in slim image
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/server/node_modules ./packages/server/node_modules
COPY --from=builder /app/packages/sdk/node_modules ./packages/sdk/node_modules
COPY --from=builder /app/package.json ./

# Copy server source code and config
COPY --from=builder /app/packages/server/src ./packages/server/src
COPY --from=builder /app/packages/server/scripts ./packages/server/scripts
COPY --from=builder /app/packages/server/tsconfig.json ./packages/server/tsconfig.json

# Copy built web assets to where server expects them
COPY --from=builder /app/packages/web/dist ./packages/server/dist/static

# Copy drizzle migrations
COPY --from=builder /app/packages/server/drizzle ./packages/server/drizzle

# Create data directory for SQLite
RUN mkdir -p /data

ENV NODE_ENV=production
ENV DATABASE_URL=/data/things.db
ENV PORT=3000

EXPOSE 3000
VOLUME /data

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["bun", "run", "--cwd", "packages/server", "scripts/start.ts"]
