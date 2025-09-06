import { NextRequest, NextResponse } from 'next/server';
import { getCookie, deleteCookie } from 'cookies-next';
import { verifyToken, deleteSession } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const token = getCookie('auth-token', { req });
    
    if (token && typeof token === 'string') {
      const { valid, sessionId } = verifyToken(token);
      
      if (valid && sessionId) {
        deleteSession(sessionId);
      }
    }
    
    const response = NextResponse.json({ 
      success: true, 
      message: 'Logged out successfully' 
    });
    
    deleteCookie('auth-token', {
      req,
      res: response,
      path: '/'
    });
    
    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json({ error: 'Logout failed' }, { status: 500 });
  }
}