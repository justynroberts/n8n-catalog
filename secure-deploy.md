# Secure Deployment Guide

## Current HTTPS Setup

Your Traefik configuration already includes Let's Encrypt:
- ✅ `entrypoints=websecure` (HTTPS on port 443)
- ✅ `tls=true` (TLS enabled)
- ✅ `tls.certresolver=letsencrypt` (Let's Encrypt certificates)

## Secure Deployment Options

### Option 1: SSH with Key-based Auth (Recommended)

Instead of using password auth that might trigger fail2ban:

1. **Add your SSH key to the server**:
   ```bash
   ssh-copy-id justyn@217.154.58.180
   ```

2. **Deploy with key auth**:
   ```bash
   ssh -i ~/.ssh/id_rsa justyn@217.154.58.180 "cd /home/justyn/work/n8n-catalog && git pull origin main && ./deploy-fix.sh"
   ```

### Option 2: GitHub Actions (Most Secure)

Create automated deployment via GitHub Actions:

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to server
        uses: appleboy/ssh-action@v0.1.7
        with:
          host: 217.154.58.180
          username: justyn
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            cd /home/justyn/work/n8n-catalog
            git pull origin main
            ./deploy-fix.sh
```

### Option 3: Webhook with HTTPS + Auth (If needed)

If you still want webhook deployment, it should be:

1. **Behind Traefik with HTTPS**
2. **Protected with strong authentication**
3. **Rate limited**
4. **IP restricted**

## Current HTTPS Status Check

Your application should already have HTTPS working via Traefik:
- **URL**: https://catalog.fintonlabs.com
- **Certificate**: Auto-managed by Let's Encrypt
- **Security headers**: Already configured in Traefik labels

## Immediate Action Required

**Delete the insecure webhook** and use secure deployment:

```bash
# Remove the insecure webhook file
rm deploy-webhook.js

# Use direct deployment instead
ssh justyn@217.154.58.180 "cd /home/justyn/work/n8n-catalog && git pull origin main && ./deploy-fix.sh"
```

## Verify HTTPS is Working

After deployment, test HTTPS:
```bash
curl -I https://catalog.fintonlabs.com
# Should return 200 OK with security headers
```

## Let's Encrypt Certificate Check

Your Traefik should automatically:
- ✅ Request certificates from Let's Encrypt
- ✅ Auto-renew before expiration  
- ✅ Redirect HTTP to HTTPS
- ✅ Apply security headers

The certificates are stored in Traefik's `acme.json` file.