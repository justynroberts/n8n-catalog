#!/bin/bash
set -e

echo "🚀 Deploying n8n-catalog to remote server with Traefik..."

# Variables
REMOTE_SERVER="217.154.58.180"
REMOTE_USER="root"  # Adjust as needed
REMOTE_PATH="/opt/n8n-catalog"

echo "📦 Building and deploying n8n-catalog..."

# Create deployment directory on remote server
ssh $REMOTE_USER@$REMOTE_SERVER "mkdir -p $REMOTE_PATH"

# Copy essential files to remote server
echo "📁 Copying files to remote server..."
scp -r \
  src/ \
  public/ \
  package.json \
  package-lock.json \
  next.config.js \
  tsconfig.json \
  tailwind.config.js \
  postcss.config.js \
  docker-compose.prod.yml \
  Dockerfile \
  docker-entrypoint.sh \
  healthcheck.js \
  scripts/ \
  CLAUDE.md \
  .env.example \
  $REMOTE_USER@$REMOTE_SERVER:$REMOTE_PATH/

# Deploy on remote server
echo "🐳 Deploying with Docker Compose on remote server..."
ssh $REMOTE_USER@$REMOTE_SERVER "
  cd $REMOTE_PATH
  
  # Stop existing containers
  docker-compose -f docker-compose.prod.yml down 2>/dev/null || true
  
  # Build and start new containers
  docker-compose -f docker-compose.prod.yml up --build -d
  
  # Wait for container to be ready
  sleep 10
  
  # Check container status
  docker-compose -f docker-compose.prod.yml ps
  
  # Check if service is responding
  docker exec n8n-catalog wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || echo 'Health check failed'
"

echo "✅ Deployment complete!"
echo "🌐 Your application should be available at: https://catalog.fintonlabs.com"
echo ""
echo "To check logs: ssh $REMOTE_USER@$REMOTE_SERVER 'docker logs n8n-catalog'"
echo "To check status: ssh $REMOTE_USER@$REMOTE_SERVER 'docker ps | grep n8n-catalog'"