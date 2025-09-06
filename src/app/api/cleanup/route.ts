import { NextRequest, NextResponse } from 'next/server';
import { SQLiteDatabase } from '@/lib/db/sqlite';
import { requireAuth } from '@/lib/auth';

export async function POST(request: NextRequest) {
  // Check authentication
  const { authenticated, response } = await requireAuth(request);
  if (!authenticated) {
    return response!;
  }
  
  try {
    const { action, tag } = await request.json();
    const db = SQLiteDatabase.getInstance();

    switch (action) {
      case 'delete-by-tag':
        if (!tag) {
          return NextResponse.json({ error: 'Tag is required' }, { status: 400 });
        }
        const deletedCount = db.deleteWorkflowsByTag(tag);
        return NextResponse.json({
          success: true,
          message: `Deleted ${deletedCount} workflows with tag "${tag}"`,
          deletedCount
        });

      case 'delete-duplicates':
        const duplicatesDeleted = db.deleteDuplicateWorkflows();
        return NextResponse.json({
          success: true,
          message: `Deleted ${duplicatesDeleted} duplicate workflows`,
          deletedCount: duplicatesDeleted
        });

      case 'clear-all':
        db.clearAllWorkflows();
        return NextResponse.json({
          success: true,
          message: 'All workflows deleted successfully'
        });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Cleanup operation failed:', error);
    return NextResponse.json({ 
      error: 'Cleanup operation failed' 
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    const db = SQLiteDatabase.getInstance();
    const tags = db.getWorkflowTags();
    const totalWorkflows = db.getWorkflowCount();

    return NextResponse.json({
      tags,
      totalWorkflows
    });
  } catch (error) {
    console.error('Failed to get cleanup info:', error);
    return NextResponse.json({ 
      error: 'Failed to get cleanup info' 
    }, { status: 500 });
  }
}