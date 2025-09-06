#!/bin/bash

# One-liner deployment script for n8n-catalog
# Copy and paste this entire command block into your remote server terminal

cat << 'DEPLOY_SCRIPT' | bash
#!/bin/bash
set -e

echo "🚀 Starting n8n-catalog deployment..."

# Navigate to deployment directory
cd /opt || { echo "❌ Cannot access /opt directory"; exit 1; }

# Remove existing installation if present
if [ -d "n8n-catalog" ]; then
    echo "🧹 Cleaning up existing installation..."
    cd n8n-catalog
    docker-compose -f docker-compose.prod.yml down 2>/dev/null || true
    cd ..
    rm -rf n8n-catalog
fi

# Clone the repository
echo "📥 Cloning repository from GitHub..."
git clone https://github.com/justynroberts/n8n-catalog.git || { echo "❌ Failed to clone repository"; exit 1; }

# Enter project directory
cd n8n-catalog || { echo "❌ Cannot access n8n-catalog directory"; exit 1; }

# Ensure traefik network exists
echo "🌐 Checking Traefik network..."
docker network ls | grep -q traefik || docker network create traefik

# Deploy with Docker Compose
echo "🐳 Building and starting containers..."
docker-compose -f docker-compose.prod.yml up --build -d || { echo "❌ Docker deployment failed"; exit 1; }

# Wait for container to start
echo "⏳ Waiting for container to initialize..."
sleep 15

# Check container status
echo "📊 Checking deployment status..."
if docker ps | grep -q "n8n-catalog"; then
    echo "✅ Container is running!"
    docker ps | grep n8n-catalog
else
    echo "❌ Container failed to start"
    docker logs n8n-catalog --tail 20
    exit 1
fi

# Test health endpoint
echo "🏥 Testing health endpoint..."
if docker exec n8n-catalog curl -f http://localhost:3000/api/health >/dev/null 2>&1; then
    echo "✅ Health check passed!"
else
    echo "⚠️ Health check failed, but container is running"
fi

# Show final status
echo ""
echo "🎉 Deployment complete!"
echo "🌐 Your application should be available at: https://catalog.fintonlabs.com"
echo ""
echo "📋 Useful commands:"
echo "  View logs: docker logs n8n-catalog"
echo "  Restart:   docker-compose -f /opt/n8n-catalog/docker-compose.prod.yml restart"
echo "  Stop:      docker-compose -f /opt/n8n-catalog/docker-compose.prod.yml down"

DEPLOY_SCRIPT