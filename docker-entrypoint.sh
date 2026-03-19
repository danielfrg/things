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
cd /app
vp run db:migrate

# Start production server in background
vp run start:server &
child=$!

# Wait for the process
wait "$child"
