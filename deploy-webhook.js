#!/usr/bin/env node

// Simple webhook server for triggering deployments
// Run this on your server: node deploy-webhook.js
// Then trigger via: curl -X POST http://your-server:3001/deploy

const http = require('http');
const { exec } = require('child_process');
const path = require('path');

const PORT = process.env.DEPLOY_PORT || 3001;
const DEPLOY_SECRET = process.env.DEPLOY_SECRET || 'n8n-catalog-deploy';

const server = http.createServer((req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.method === 'POST' && req.url === '/deploy') {
    console.log(`[${new Date().toISOString()}] Deployment request received`);
    
    // Change to project directory
    const projectDir = '/home/justyn/work/n8n-catalog';
    
    // Run deployment commands
    const commands = [
      'git pull origin main',
      'chmod +x deploy-fix.sh',
      './deploy-fix.sh'
    ];
    
    const fullCommand = `cd ${projectDir} && ${commands.join(' && ')}`;
    
    console.log(`[${new Date().toISOString()}] Executing: ${fullCommand}`);
    
    exec(fullCommand, (error, stdout, stderr) => {
      const response = {
        timestamp: new Date().toISOString(),
        success: !error,
        stdout: stdout,
        stderr: stderr,
        error: error ? error.message : null
      };
      
      console.log(`[${new Date().toISOString()}] Deployment ${error ? 'failed' : 'completed'}`);
      
      res.setHeader('Content-Type', 'application/json');
      res.writeHead(error ? 500 : 200);
      res.end(JSON.stringify(response, null, 2));
    });
  } else if (req.method === 'GET' && req.url === '/status') {
    // Check container status
    exec('cd /home/justyn/work/n8n-catalog && docker-compose -f docker-compose.prod.yml ps && docker-compose -f docker-compose.prod.yml logs --tail=10', (error, stdout, stderr) => {
      res.setHeader('Content-Type', 'text/plain');
      res.writeHead(200);
      res.end(`Container Status:\n${stdout}\n\nRecent Logs:\n${stderr}`);
    });
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Deployment webhook server running on port ${PORT}`);
  console.log(`Trigger deployment: curl -X POST http://localhost:${PORT}/deploy`);
  console.log(`Check status: curl http://localhost:${PORT}/status`);
});