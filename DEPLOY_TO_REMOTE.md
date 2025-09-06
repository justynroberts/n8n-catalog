# 🚀 Deploy n8n-catalog to Remote Server

## Quick Deploy Commands

**Run these commands on your remote server (217.154.58.180):**

```bash
# 1. Clone the repository
cd /opt
git clone https://github.com/justynroberts/n8n-catalog.git
cd n8n-catalog

# 2. Stop any existing containers
docker-compose -f docker-compose.prod.yml down 2>/dev/null || true

# 3. Build and start with Traefik
docker-compose -f docker-compose.prod.yml up --build -d

# 4. Check deployment
docker ps | grep n8n-catalog
docker logs n8n-catalog --tail 20

# 5. Test health endpoint
docker exec n8n-catalog curl -f http://localhost:3000/api/health || echo "Health check failed"
```

## Verify Deployment

After running the above commands, your application should be available at:
**https://catalog.fintonlabs.com**

## Troubleshooting

If the deployment fails, check:

```bash
# Check container logs
docker logs n8n-catalog

# Check if container is running
docker ps | grep n8n

# Check Traefik integration
docker network ls | grep traefik

# Restart if needed
docker-compose -f docker-compose.prod.yml restart
```

## Environment Variables (Optional)

If you want to customize settings, create a `.env` file:

```bash
# Create .env file in /opt/n8n-catalog/
cat > .env << 'EOF'
NODE_ENV=production
JWT_SECRET=your-secure-jwt-secret-here
DATABASE_PATH=/app/data/workflows.db
EOF

# Restart to pick up changes
docker-compose -f docker-compose.prod.yml restart
```

---

## What's Configured

- ✅ **Domain**: catalog.fintonlabs.com
- ✅ **SSL**: Auto-generated with Let's Encrypt
- ✅ **Traefik Integration**: Labels configured
- ✅ **Hostname Binding**: Fixed with HOSTNAME=0.0.0.0
- ✅ **Health Checks**: Configured and working
- ✅ **Database**: SQLite with persistent volume
- ✅ **Security**: Non-root user, proper permissions

The application will be available at https://catalog.fintonlabs.com once deployed!