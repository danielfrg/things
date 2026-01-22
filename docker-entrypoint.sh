#!/bin/bash
set -e

# Function to handle shutdown
shutdown() {
  echo "Shutting down..."
  kill -TERM "$child" 2>/dev/null
  wait "$child"
  exit 0
}

# Set up signal handlers
trap shutdown SIGTERM SIGINT

# Run migrations
cd /app/packages/web
bun run scripts/migrate.ts

# Start production server in background
bun run production-server.ts &
child=$!

# Wait for the process
wait "$child"
