#!/bin/bash

echo "🚀 Deploying n8n-catalog database fixes..."

# Pull latest changes
echo "📥 Pulling latest changes..."
git pull origin main

# Stop the current container
echo "🛑 Stopping current containers..."
docker-compose -f docker-compose.prod.yml down

# Check and fix data directory permissions
echo "🔧 Checking data directory permissions..."
sudo mkdir -p data uploads
sudo chown -R $USER:$USER data uploads
ls -la data/ uploads/

# Rebuild and restart with fresh database initialization
echo "🏗️ Rebuilding and starting containers..."
docker-compose -f docker-compose.prod.yml up -d --build

# Wait for container to start
echo "⏳ Waiting for container to initialize..."
sleep 10

# Check container status and logs
echo "📊 Container status:"
docker-compose -f docker-compose.prod.yml ps

echo "📋 Recent container logs:"
docker-compose -f docker-compose.prod.yml logs --tail=20

echo "✅ Deployment complete!"
echo "🌐 Application should be available at: https://catalog.fintonlabs.com"
echo ""
echo "🔍 To check if database initialized correctly, look for these log messages:"
echo "   - 'Database path: /app/data/workflows.db'"
echo "   - 'SQLite database initialized successfully'"
echo "   - 'Initialized XX sample workflows' (if database was empty)"