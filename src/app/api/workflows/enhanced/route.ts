import { NextRequest, NextResponse } from 'next/server';
import { SQLiteDatabase } from '@/lib/db/sqlite';
import { WorkflowAnalysis } from '@/types/workflow';
import { obfuscateWorkflowData } from '@/lib/anti-scrape';
import { getCookie } from 'cookies-next';
import { verifyToken } from '@/lib/auth';
import { createHash } from 'crypto';
import { gzip } from 'zlib';
import { promisify } from 'util';

const gzipAsync = promisify(gzip);
const db = SQLiteDatabase.getInstance();

interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

function generateETag(data: any): string {
  const content = JSON.stringify(data);
  return createHash('md5').update(content).digest('hex');
}

async function compressResponse(data: any): Promise<Buffer> {
  const jsonString = JSON.stringify(data);
  return gzipAsync(Buffer.from(jsonString, 'utf-8'));
}

function paginateArray<T>(
  array: T[], 
  page: number, 
  limit: number
): PaginatedResponse<T> {
  const total = array.length;
  const totalPages = Math.ceil(total / limit);
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const data = array.slice(startIndex, endIndex);
  
  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasMore: page < totalPages
    }
  };
}

function sortWorkflows(
  workflows: WorkflowAnalysis[], 
  sortBy: string = 'rating', 
  sortOrder: 'asc' | 'desc' = 'desc'
): WorkflowAnalysis[] {
  return workflows.sort((a, b) => {
    let aValue: any, bValue: any;
    
    switch (sortBy) {
      case 'name':
        aValue = a.name?.toLowerCase() || '';
        bValue = b.name?.toLowerCase() || '';
        break;
      case 'rating':
        aValue = a.rating || 0;
        bValue = b.rating || 0;
        break;
      case 'nodeCount':
        aValue = a.nodes?.length || 0;
        bValue = b.nodes?.length || 0;
        break;
      case 'lastAnalyzed':
        aValue = new Date(a.lastAnalyzed || 0).getTime();
        bValue = new Date(b.lastAnalyzed || 0).getTime();
        break;
      case 'category':
        aValue = a.category?.toLowerCase() || '';
        bValue = b.category?.toLowerCase() || '';
        break;
      default:
        return 0;
    }
    
    if (typeof aValue === 'string') {
      const result = aValue.localeCompare(bValue);
      return sortOrder === 'asc' ? result : -result;
    } else {
      const result = aValue - bValue;
      return sortOrder === 'asc' ? result : -result;
    }
  });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('search');
    const id = searchParams.get('id');
    const format = searchParams.get('format');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100); // Cap at 100
    const sortBy = searchParams.get('sortBy') || 'rating';
    const sortOrder = (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc';

    // Check authentication
    const token = getCookie('auth-token', { req: request });
    let isAuthenticated = false;
    
    try {
      isAuthenticated = token ? verifyToken(token as string).valid : false;
    } catch (error) {
      console.log('Token verification failed, continuing as unauthenticated user');
      isAuthenticated = false;
    }

    // Handle single workflow request
    if (id) {
      const workflow = db.getWorkflowById(id);
      if (!workflow) {
        return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
      }
      
      if (format === 'n8n') {
        if (!isAuthenticated) {
          return NextResponse.json({ error: 'Authentication required for workflow data' }, { status: 401 });
        }
        if (!workflow.workflowData) {
          return NextResponse.json({ error: 'No workflow data available' }, { status: 404 });
        }
        return NextResponse.json(workflow.workflowData);
      }
      
      const result = isAuthenticated ? workflow : obfuscateWorkflowData(workflow);
      const etag = generateETag(result);
      
      // Check if client has cached version
      const ifNoneMatch = request.headers.get('if-none-match');
      if (ifNoneMatch === etag) {
        return new NextResponse(null, { status: 304 });
      }
      
      return NextResponse.json(result, {
        headers: {
          'ETag': etag,
          'Cache-Control': 'public, max-age=300' // 5 minutes
        }
      });
    }

    // Handle workflow listing
    let workflows: WorkflowAnalysis[];
    if (query) {
      workflows = db.searchWorkflows(query);
    } else {
      workflows = db.getAllWorkflows();
    }

    // Apply sorting
    workflows = sortWorkflows(workflows, sortBy, sortOrder);

    // Obfuscate data for non-authenticated users
    if (!isAuthenticated) {
      workflows = workflows.map(workflow => obfuscateWorkflowData(workflow));
    }

    // Paginate results
    const paginatedResult = paginateArray(workflows, page, limit);
    
    // Generate ETag for the paginated result
    const etag = generateETag({
      ...paginatedResult,
      auth: isAuthenticated,
      query,
      sortBy,
      sortOrder
    });
    
    // Check if client has cached version
    const ifNoneMatch = request.headers.get('if-none-match');
    if (ifNoneMatch === etag) {
      return new NextResponse(null, { status: 304 });
    }

    // Check if client accepts gzip compression
    const acceptEncoding = request.headers.get('accept-encoding') || '';
    const supportsGzip = acceptEncoding.includes('gzip');
    
    const responseHeaders: HeadersInit = {
      'ETag': etag,
      'Cache-Control': 'public, max-age=180', // 3 minutes for lists
      'Content-Type': 'application/json',
      'X-Total-Count': paginatedResult.pagination.total.toString(),
      'X-Page': paginatedResult.pagination.page.toString(),
      'X-Page-Size': paginatedResult.pagination.limit.toString(),
      'X-Total-Pages': paginatedResult.pagination.totalPages.toString()
    };

    // Return compressed response if supported
    if (supportsGzip && paginatedResult.data.length > 10) {
      try {
        const compressed = await compressResponse(paginatedResult);
        responseHeaders['Content-Encoding'] = 'gzip';
        responseHeaders['Content-Length'] = compressed.length.toString();
        
        return new NextResponse(compressed as any, {
          headers: responseHeaders
        });
      } catch (compressionError) {
        console.warn('Compression failed, returning uncompressed response:', compressionError);
      }
    }

    // Return uncompressed response
    return NextResponse.json(paginatedResult, {
      headers: responseHeaders
    });
    
  } catch (error) {
    console.error('Failed to get workflows:', error);
    return NextResponse.json(
      { error: 'Failed to get workflows' }, 
      { status: 500 }
    );
  }
}

// POST and DELETE methods remain the same but with cache invalidation hints
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (Array.isArray(body)) {
      db.saveWorkflows(body);
      
      return NextResponse.json(
        { success: true, count: body.length },
        {
          headers: {
            'X-Cache-Invalidate': 'all',
            'Cache-Control': 'no-cache'
          }
        }
      );
    } else {
      db.saveWorkflow(body);
      
      return NextResponse.json(
        { success: true },
        {
          headers: {
            'X-Cache-Invalidate': `workflow:${body.id}`,
            'Cache-Control': 'no-cache'
          }
        }
      );
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
      
      return NextResponse.json(
        { success: true },
        {
          headers: {
            'X-Cache-Invalidate': 'all',
            'Cache-Control': 'no-cache'
          }
        }
      );
    } else if (id) {
      db.deleteWorkflow(id);
      
      return NextResponse.json(
        { success: true },
        {
          headers: {
            'X-Cache-Invalidate': `workflow:${id}`,
            'Cache-Control': 'no-cache'
          }
        }
      );
    }
    
    return NextResponse.json({ error: 'Workflow ID required' }, { status: 400 });
  } catch (error) {
    console.error('Failed to delete workflow:', error);
    return NextResponse.json({ error: 'Failed to delete workflow' }, { status: 500 });
  }
}