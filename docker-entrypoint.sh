#!/bin/sh
set -e

# Set default environment variables
export NODE_ENV=${NODE_ENV:-production}
export PORT=${PORT:-3000}
export HOSTNAME=${HOSTNAME:-0.0.0.0}
export DATABASE_PATH=${DATABASE_PATH:-/app/data/workflows.db}

# Generate JWT secret if not provided
if [ -z "$JWT_SECRET" ]; then
    export JWT_SECRET=$(head -c 32 /dev/urandom | base64 | tr -d '\n')
    echo "🔐 Generated JWT secret (set JWT_SECRET env var for persistence across restarts)"
else
    echo "🔐 Using provided JWT secret"
fi

# Create data directory if it doesn't exist
mkdir -p /app/data

# Set proper permissions for data directory
if [ "$(id -u)" = "1001" ]; then
    # Running as nextjs user
    chown -R nextjs:nodejs /app/data 2>/dev/null || true
fi

# Log startup information
echo "🚀 Starting n8n Catalog..."
echo "📍 Port: $PORT"
echo "📍 Environment: $NODE_ENV"
echo "📍 Database: $DATABASE_PATH"
echo "📍 Hostname: $HOSTNAME"

# Initialize database if it doesn't exist
if [ ! -f "$DATABASE_PATH" ]; then
    echo "📦 Initializing new SQLite database at $DATABASE_PATH"
    # Database will be created automatically by the application
fi

# Check if we can write to the data directory
if [ ! -w "/app/data" ]; then
    echo "⚠️  Warning: Cannot write to /app/data directory"
    echo "   Make sure the directory has proper permissions"
fi

# Health check function for container health
if [ "$1" = "healthcheck" ]; then
    # Simple HTTP health check
    wget --no-verbose --tries=1 --spider "http://localhost:$PORT" || exit 1
    exit 0
fi

echo "✅ Starting application server..."
echo "ℹ️  Default admin password: 'admin' (please change after first login)"

# Execute the main command
exec "$@"