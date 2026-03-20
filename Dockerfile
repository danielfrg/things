# Stage 1: Build web package
FROM node:22-bookworm-slim AS builder

# Install build tools needed for native modules (better-sqlite3)
RUN apt-get update && apt-get install -y python3 make g++ git && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ARG APP_VERSION=dev

# Copy package files first for better caching
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/server/package.json ./packages/server/
COPY packages/sdk/package.json ./packages/sdk/
COPY packages/web/package.json ./packages/web/

# Install dependencies
RUN npm install -g vite-plus && vp install --frozen-lockfile

# Copy source code
COPY . .

ENV APP_VERSION=$APP_VERSION
RUN vp run build:web

# Stage 2: Production server
FROM node:22-bookworm-slim AS production

# Install tini for proper signal handling
RUN apt-get update && apt-get install -y tini && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy root node_modules from builder (workspace deps are installed here)
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

# Copy server source code and config
COPY --from=builder /app/packages/server/src ./packages/server/src
COPY --from=builder /app/packages/server/scripts ./packages/server/scripts
COPY --from=builder /app/packages/server/tsconfig.json ./packages/server/tsconfig.json

# Copy SDK source (workspace dependency used by server)
COPY --from=builder /app/packages/sdk/package.json ./packages/sdk/package.json
COPY --from=builder /app/packages/sdk/src ./packages/sdk/src

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
CMD ["node_modules/.bin/tsx", "packages/server/scripts/start.ts"]
