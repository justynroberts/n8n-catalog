import { NextRequest, NextResponse } from 'next/server';
import { requireAuthHeader } from '@/lib/auth';
import { clearRateLimits } from '@/lib/anti-scrape';

export async function POST(req: NextRequest) {
  // Check authentication
  const { authenticated, response } = await requireAuthHeader(req);
  if (!authenticated) {
    return response!;
  }
  
  try {
    clearRateLimits();
    
    return NextResponse.json({ 
      success: true, 
      message: 'Rate limits cleared successfully' 
    });
  } catch (error) {
    console.error('Clear rate limits error:', error);
    return NextResponse.json({ error: 'Failed to clear rate limits' }, { status: 500 });
  }
}