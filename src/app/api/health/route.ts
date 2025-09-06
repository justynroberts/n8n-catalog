import { NextResponse } from 'next/server';
import { SQLiteDatabase } from '@/lib/db/sqlite';

export async function GET() {
  try {
    // Basic health check
    const db = SQLiteDatabase.getInstance();
    
    // Test database connectivity using a public method
    const stats = db.getDatabaseStats();
    
    if (stats && typeof stats.totalWorkflows === 'number') {
      return NextResponse.json({ 
        status: 'healthy',
        timestamp: new Date().toISOString(),
        database: 'connected',
        workflows: stats.totalWorkflows
      });
    } else {
      throw new Error('Database check failed');
    }
  } catch (error) {
    return NextResponse.json({ 
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 503 });
  }
}