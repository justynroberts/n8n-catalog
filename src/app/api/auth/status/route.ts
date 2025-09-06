import { NextRequest, NextResponse } from 'next/server';
import { getCookie } from 'cookies-next';
import { verifyToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json();
    
    if (!token || typeof token !== 'string') {
      return NextResponse.json({ authenticated: false });
    }
    
    const { valid } = verifyToken(token);
    
    return NextResponse.json({ authenticated: valid });
  } catch (error) {
    console.error('Auth status error:', error);
    return NextResponse.json({ authenticated: false });
  }
}