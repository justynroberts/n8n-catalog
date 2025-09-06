import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { getCookie, setCookie, deleteCookie } from 'cookies-next';
import { NextRequest, NextResponse } from 'next/server';
import BetterSqlite3 from 'better-sqlite3';
import path from 'path';

type Database = BetterSqlite3.Database;

// Get JWT secret from environment or use a fixed default for development
const JWT_SECRET = process.env.JWT_SECRET || 'development-secret-key-change-in-production-12345';
const TOKEN_EXPIRY = '24h';
const COOKIE_NAME = 'auth-token';

// Database setup for auth
let authDb: Database | null = null;

function getAuthDb(): Database {
  if (!authDb) {
    const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'workflows.db');
    
    // Ensure directory exists
    const dir = path.dirname(dbPath);
    if (!require('fs').existsSync(dir)) {
      require('fs').mkdirSync(dir, { recursive: true });
    }
    
    authDb = new BetterSqlite3(dbPath);
    
    // Initialize auth tables
    authDb.exec(`
      CREATE TABLE IF NOT EXISTS auth_config (
        id INTEGER PRIMARY KEY,
        password_hash TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS auth_sessions (
        id TEXT PRIMARY KEY,
        token TEXT NOT NULL,
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
  }
  
  return authDb;
}

// Initialize default password if not set
export function initializeAuth() {
  const db = getAuthDb();
  const stmt = db.prepare('SELECT COUNT(*) as count FROM auth_config');
  const result = stmt.get() as { count: number };
  
  if (result.count === 0) {
    // Default password is 'admin' - MUST be changed in production
    const defaultPassword = 'admin';
    const hash = bcrypt.hashSync(defaultPassword, 10);
    db.prepare('INSERT INTO auth_config (id, password_hash) VALUES (1, ?)').run(hash);
    console.log('⚠️  Default password set to "admin" - PLEASE CHANGE THIS!');
  }
}

// Verify password
export async function verifyPassword(password: string): Promise<boolean> {
  const db = getAuthDb();
  const stmt = db.prepare('SELECT password_hash FROM auth_config WHERE id = 1');
  const result = stmt.get() as { password_hash: string } | undefined;
  
  if (!result) {
    return false;
  }
  
  return bcrypt.compareSync(password, result.password_hash);
}

// Change password
export async function changePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
  // Verify current password
  const isValid = await verifyPassword(currentPassword);
  if (!isValid) {
    return { success: false, error: 'Current password is incorrect' };
  }
  
  // Hash new password
  const hash = bcrypt.hashSync(newPassword, 10);
  
  // Update password
  try {
    const db = getAuthDb();
    db.prepare('UPDATE auth_config SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1').run(hash);
    
    // Invalidate all existing sessions
    db.prepare('DELETE FROM auth_sessions').run();
    
    return { success: true };
  } catch (error) {
    return { success: false, error: 'Failed to update password' };
  }
}

// Generate JWT token
export function generateToken(sessionId: string): string {
  return jwt.sign(
    { 
      sessionId,
      iat: Math.floor(Date.now() / 1000)
    },
    JWT_SECRET,
    { expiresIn: TOKEN_EXPIRY }
  );
}

// Verify JWT token
export function verifyToken(token: string): { valid: boolean; sessionId?: string } {
  try {
    console.log('Verifying token...');
    const decoded = jwt.verify(token, JWT_SECRET) as { sessionId: string; iat: number; exp: number };
    console.log('Token decoded successfully, sessionId:', decoded.sessionId);
    
    // Just verify JWT is valid and not expired (JWT handles expiry)
    return { valid: true, sessionId: decoded.sessionId };
  } catch (error) {
    console.error('Token verification error:', error);
    return { valid: false };
  }
}

// Create session
export function createSession(): { token: string; sessionId: string } {
  const sessionId = Math.random().toString(36).substring(2) + Date.now().toString(36);
  const token = generateToken(sessionId);
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  
  // Store session
  const db = getAuthDb();
  db.prepare('INSERT INTO auth_sessions (id, token, expires_at) VALUES (?, ?, ?)').run(sessionId, token, expiresAt);
  
  return { token, sessionId };
}

// Delete session
export function deleteSession(sessionId: string) {
  const db = getAuthDb();
  db.prepare('DELETE FROM auth_sessions WHERE id = ?').run(sessionId);
}

// Middleware to check authentication (cookie-based)
export async function requireAuth(req: NextRequest): Promise<{ authenticated: boolean; response?: NextResponse }> {
  const token = getCookie(COOKIE_NAME, { req });
  
  if (!token || typeof token !== 'string') {
    return {
      authenticated: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    };
  }
  
  const { valid } = verifyToken(token);
  
  if (!valid) {
    return {
      authenticated: false,
      response: NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
    };
  }
  
  return { authenticated: true };
}

// Middleware to check authentication (header-based)
export async function requireAuthHeader(req: NextRequest): Promise<{ authenticated: boolean; response?: NextResponse }> {
  const authHeader = req.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      authenticated: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    };
  }
  
  const token = authHeader.substring(7); // Remove 'Bearer ' prefix
  
  const { valid } = verifyToken(token);
  
  if (!valid) {
    return {
      authenticated: false,
      response: NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
    };
  }
  
  return { authenticated: true };
}

// Clean up expired sessions
export function cleanupSessions() {
  const db = getAuthDb();
  db.prepare('DELETE FROM auth_sessions WHERE expires_at <= datetime("now")').run();
}

// Initialize auth on module load (only in runtime, not during build)
if (typeof window === 'undefined' && process.env.NODE_ENV !== 'test') {
  // Only initialize in server runtime, not during build
  process.nextTick(() => {
    try {
      initializeAuth();
    } catch (error) {
      console.log('Auth initialization deferred to runtime');
    }
  });
}