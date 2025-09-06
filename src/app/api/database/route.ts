import { NextRequest, NextResponse } from 'next/server';
import { SQLiteDatabase } from '@/lib/db/sqlite';
import { requireAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  // Check authentication
  const { authenticated, response } = await requireAuth(request);
  if (!authenticated) {
    return response!;
  }
  
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    
    const db = SQLiteDatabase.getInstance();
    
    if (action === 'export') {
      // Export database with error handling
      let exportData: string;
      try {
        exportData = db.exportDatabase();
      } catch (dbError) {
        console.error('Database export error:', dbError);
        return NextResponse.json({ 
          error: `Database export error: ${dbError}` 
        }, { status: 500 });
      }
      
      return new NextResponse(exportData, {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="n8n-catalog-export-${new Date().toISOString().split('T')[0]}.json"`,
        },
      });
    } else if (action === 'stats') {
      // Get database statistics
      const stats = db.getDatabaseStats();
      
      return NextResponse.json({
        success: true,
        data: stats
      });
    } else {
      return NextResponse.json({ 
        error: 'Invalid action. Use "export" or "stats"' 
      }, { status: 400 });
    }
  } catch (error) {
    console.error('Database operation failed:', error);
    return NextResponse.json({ 
      error: 'Database operation failed' 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  // Check authentication
  const { authenticated, response } = await requireAuth(request);
  if (!authenticated) {
    return response!;
  }
  
  try {
    const { action, data, options = {} } = await request.json();
    
    if (action !== 'import') {
      return NextResponse.json({ 
        error: 'Invalid action. Only "import" is supported for POST' 
      }, { status: 400 });
    }
    
    if (!data) {
      return NextResponse.json({ 
        error: 'Import data is required' 
      }, { status: 400 });
    }
    
    const db = SQLiteDatabase.getInstance();
    
    // Import database
    const result = db.importDatabase(data, {
      clearExisting: options.clearExisting || false,
      skipDuplicates: options.skipDuplicates !== false, // Default to true
      preserveIds: options.preserveIds || false
    });
    
    return NextResponse.json({
      success: true,
      message: `Import completed: ${result.imported} imported, ${result.skipped} skipped`,
      data: result
    });
    
  } catch (error) {
    console.error('Database import failed:', error);
    return NextResponse.json({ 
      error: `Database import failed: ${error}` 
    }, { status: 500 });
  }
}