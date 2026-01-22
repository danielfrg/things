# Stage 1: Build
FROM oven/bun:debian AS builder
WORKDIR /app

# Copy package files first for layer caching
COPY package.json bun.lock tsconfig.json ./
COPY packages/web/package.json ./packages/web/

# Install dependencies
RUN bun install

# Copy source code
COPY packages/web/ ./packages/web/

# Build the app
RUN bun run --filter @things/web build

# Stage 2: Serve
FROM oven/bun:debian AS runner
WORKDIR /app

# Copy everything needed
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/web/node_modules ./packages/web/node_modules
COPY --from=builder /app/packages/web/dist ./packages/web/dist
COPY --from=builder /app/packages/web/drizzle ./packages/web/drizzle
COPY --from=builder /app/packages/web/scripts ./packages/web/scripts
COPY --from=builder /app/packages/web/production-server.ts ./packages/web/
COPY --from=builder /app/packages/web/package.json ./packages/web/
COPY --from=builder /app/package.json ./

COPY docker-entrypoint.sh ./

# Create data directory
RUN mkdir -p /data

ENV NODE_ENV=production
ENV DATABASE_URL=/data/things.db
ENV PORT=3000

EXPOSE 3000

VOLUME /data

CMD ["./docker-entrypoint.sh"]
