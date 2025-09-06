# N8N Catalog Deployment Guide

## Quick Deployment

### On Remote Server

1. **Pull and deploy the database fixes**:
   ```bash
   cd /home/justyn/work/n8n-catalog
   ./deploy-fix.sh
   ```

### Manual Deployment Steps

If the automated script doesn't work, run these commands manually:

1. **Pull latest changes**:
   ```bash
   git pull origin main
   ```

2. **Stop current containers**:
   ```bash
   docker-compose -f docker-compose.prod.yml down
   ```

3. **Fix data directory permissions**:
   ```bash
   sudo mkdir -p data uploads
   sudo chown -R justyn:justyn data uploads
   ```

4. **Rebuild and restart**:
   ```bash
   docker-compose -f docker-compose.prod.yml up -d --build
   ```

5. **Check logs**:
   ```bash
   docker-compose -f docker-compose.prod.yml logs -f
   ```

## What Was Fixed

### Database Issues
- ✅ Fixed database path configuration to use `DATABASE_PATH=/app/data/workflows.db`
- ✅ Added automatic directory creation with proper permissions
- ✅ Enhanced error handling and logging for database initialization
- ✅ Added sample data initialization for empty databases
- ✅ Improved database connection error reporting

### Expected Log Output
When the application starts correctly, you should see:
```
Database path: /app/data/workflows.db
Data directory: /app/data
Initializing SQLite database at: /app/data/workflows.db
SQLite database initialized successfully
```

### If Database is Empty
If no existing workflows are found, the system will automatically create 20 sample workflows:
```
Initializing sample workflow data...
Initialized 20 sample workflows
```

## Troubleshooting

### Still Seeing Placeholder Page?
1. Check container logs: `docker-compose -f docker-compose.prod.yml logs`
2. Look for database initialization messages
3. Verify `/app/data/workflows.db` file is created inside container
4. Check file permissions on `data/` directory

### Database Permissions Issues?
```bash
# Fix ownership
sudo chown -R justyn:justyn data uploads

# Check permissions
ls -la data/
```

### Container Won't Start?
```bash
# Check container status
docker-compose -f docker-compose.prod.yml ps

# View full logs
docker-compose -f docker-compose.prod.yml logs
```

## Environment Variables

The following environment variables are configured in `docker-compose.prod.yml`:
- `NODE_ENV=production`
- `DATABASE_PATH=/app/data/workflows.db` 
- `HOSTNAME=0.0.0.0`
- `PORT=3000`

## Application Access

After successful deployment:
- **URL**: https://catalog.fintonlabs.com
- **Expected**: Full n8n workflow catalog interface with workflow cards, search, and filtering
- **Not Expected**: Simple placeholder page saying "Application is running successfully!"
