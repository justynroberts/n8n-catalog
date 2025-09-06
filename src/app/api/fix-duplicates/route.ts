import { NextResponse } from 'next/server';
import { SQLiteDatabase } from '@/lib/db/sqlite';

export async function POST() {
  try {
    const db = SQLiteDatabase.getInstance();
    const fixedCount = db.fixDuplicateNames();
    
    return NextResponse.json({
      success: true,
      message: `Fixed ${fixedCount} duplicate workflow names`,
      fixedCount
    });
  } catch (error) {
    console.error('Failed to fix duplicate names:', error);
    return NextResponse.json({ 
      error: 'Failed to fix duplicate names' 
    }, { status: 500 });
  }
}