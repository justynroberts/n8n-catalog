import { NextRequest, NextResponse } from 'next/server';
import { SQLiteDatabase } from '@/lib/db/sqlite';
import { WorkflowAnalysis } from '@/types/workflow';
import { obfuscateWorkflowData } from '@/lib/anti-scrape';
import { getCookie } from 'cookies-next';
import { verifyToken } from '@/lib/auth';

const db = SQLiteDatabase.getInstance();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('search');
    const id = searchParams.get('id');
    const format = searchParams.get('format'); // 'n8n' for raw workflow data
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200); // Cap at 200, default 50

    // Check authentication for sensitive operations
    const token = getCookie('auth-token', { req: request });
    let isAuthenticated = false;
    
    try {
      isAuthenticated = token ? verifyToken(token as string).valid : false;
    } catch (error) {
      // Ignore token verification errors for workflow listing
      console.log('Token verification failed, continuing as unauthenticated user');
      isAuthenticated = false;
    }

    if (id) {
      const workflow = db.getWorkflowById(id);
      if (!workflow) {
        return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
      }
      
      // Raw workflow data requires authentication
      if (format === 'n8n') {
        if (!isAuthenticated) {
          return NextResponse.json({ error: 'Authentication required for workflow data' }, { status: 401 });
        }
        if (!workflow.workflowData) {
          return NextResponse.json({ error: 'No workflow data available' }, { status: 404 });
        }
        return NextResponse.json(workflow.workflowData);
      }
      
      // Return obfuscated workflow for non-authenticated users
      const result = isAuthenticated ? workflow : obfuscateWorkflowData(workflow);
      return NextResponse.json(result);
    }

    // Get workflows with proper data filtering
    let allWorkflows: WorkflowAnalysis[];
    if (query) {
      allWorkflows = db.searchWorkflows(query);
    } else {
      // Load all workflows for everyone
      allWorkflows = db.getAllWorkflows();
    }

    // Implement basic pagination
    const total = allWorkflows.length;
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;
    const workflows = allWorkflows.slice(offset, offset + limit);

    // Obfuscate data for non-authenticated users
    const processedWorkflows = !isAuthenticated 
      ? workflows.map(workflow => obfuscateWorkflowData(workflow))
      : workflows;

    // Create paginated response
    const paginatedResponse = {
      workflows: processedWorkflows,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasMore: page < totalPages
      }
    };

    // Add caching headers for performance
    const headers: HeadersInit = {
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=600', // 5min cache, 10min stale
      'X-Total-Count': total.toString(),
      'X-Page': page.toString(),
      'X-Page-Size': limit.toString(),
      'X-Total-Pages': totalPages.toString()
    };

    // Add ETag for conditional requests
    const etag = `W/"${total}-${page}-${limit}-${Date.now()}"`;
    headers['ETag'] = etag;

    // Check if client has cached version
    const ifNoneMatch = request.headers.get('if-none-match');
    if (ifNoneMatch === etag) {
      return new NextResponse(null, { status: 304, headers });
    }

    return NextResponse.json(paginatedResponse, { headers });
  } catch (error) {
    console.error('Failed to get workflows:', error);
    return NextResponse.json({ error: 'Failed to get workflows' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (Array.isArray(body)) {
      // Bulk save workflows
      db.saveWorkflows(body);
      return NextResponse.json({ success: true, count: body.length });
    } else {
      // Save single workflow
      db.saveWorkflow(body);
      return NextResponse.json({ success: true });
    }
  } catch (error) {
    console.error('Failed to save workflow:', error);
    return NextResponse.json({ error: 'Failed to save workflow' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (id === 'all') {
      db.clearAllWorkflows();
      return NextResponse.json({ success: true });
    }
    
    if (id) {
      db.deleteWorkflow(id);
      return NextResponse.json({ success: true });
    }
    
    return NextResponse.json({ error: 'No ID provided' }, { status: 400 });
  } catch (error) {
    console.error('Failed to delete workflow:', error);
    return NextResponse.json({ error: 'Failed to delete workflow' }, { status: 500 });
  }
}