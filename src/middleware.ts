import { NextRequest, NextResponse } from 'next/server';
import { getCookie } from 'cookies-next';
import { rateLimit, obfuscateWorkflowData } from '@/lib/anti-scrape';
import jwt from 'jsonwebtoken';

// Simple JWT verification for middleware (without database)
function verifyTokenSimple(token: string): boolean {
  try {
    const JWT_SECRET = process.env.JWT_SECRET || 'development-secret-key-change-in-production-12345';
    jwt.verify(token, JWT_SECRET);
    return true;
  } catch (error) {
    return false;
  }
}

// List of protected routes
const protectedRoutes = [
  '/import',
  // '/api/import', // Temporarily allow import polling without auth to fix redirect loop
  '/api/database',
  '/api/cleanup',
  '/api/fix-duplicates',
  '/api/auth/change-password'
];

// List of auth routes (should redirect to home if already authenticated)
const authRoutes = ['/login'];

// Routes that need anti-scraping protection
const apiRoutes = ['/api/workflows', '/api/health'];
const rateLimitedRoutes = [...apiRoutes, '/'];

// Exclude auth routes and import routes from rate limiting
const excludeFromRateLimit = ['/api/auth/login', '/api/auth/logout', '/api/auth/status', '/api/import'];

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const cookieToken = getCookie('auth-token', { req: request });
  const bearerToken = request.headers.get('authorization')?.replace('Bearer ', '');
  const token = cookieToken || bearerToken;
  
  // Rate limiting disabled
  /*
  // Apply rate limiting to prevent scraping (but exclude auth routes and authenticated users)
  let isAuthenticated = false;
  if (token) {
    isAuthenticated = verifyTokenSimple(token);
  }
  const isRateLimited = rateLimitedRoutes.some(route => pathname.startsWith(route)) && 
                       !excludeFromRateLimit.some(route => pathname.startsWith(route)) &&
                       !isAuthenticated; // Skip rate limiting for authenticated users
  
  if (isRateLimited) {
    const { allowed, remaining, resetTime, reason } = rateLimit(request, {
      maxRequests: 60, // 60 requests per window for unauthenticated users only
      windowMs: 15 * 60 * 1000, // 15 minutes
      blockDuration: 60 * 60 * 1000, // 1 hour block
      checkUserAgent: true
    });
    
    if (!allowed) {
      return new NextResponse(
        JSON.stringify({ 
          error: 'Rate limit exceeded', 
          reason,
          retryAfter: Math.ceil((resetTime - Date.now()) / 1000)
        }),
        { 
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': Math.ceil((resetTime - Date.now()) / 1000).toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(resetTime).toISOString()
          }
        }
      );
    }
    
    // Add rate limit headers to successful responses
    const response = NextResponse.next();
    response.headers.set('X-RateLimit-Remaining', remaining.toString());
    response.headers.set('X-RateLimit-Reset', new Date(resetTime).toISOString());
  }
  */
  
  // Check if route is protected
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));
  const isAuthRoute = authRoutes.some(route => pathname.startsWith(route));
  
  // If accessing protected route without token, redirect to login
  if (isProtectedRoute && !token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('returnUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }
  
  // If accessing auth route with token, redirect to home
  if (isAuthRoute && token) {
    return NextResponse.redirect(new URL('/', request.url));
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};