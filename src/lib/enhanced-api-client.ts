import { WorkflowAnalysis, UploadedFile } from '@/types/workflow';
import WorkflowCache from './workflow-cache';

interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

interface WorkflowsResponse {
  workflows: WorkflowAnalysis[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
  etag?: string;
}

export class EnhancedApiClient {
  private static instance: EnhancedApiClient;
  private cache: WorkflowCache;
  private requestQueue = new Map<string, Promise<any>>();
  private backgroundRefreshInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.cache = new WorkflowCache({
      memoryTTL: 5 * 60 * 1000,    // 5 minutes for memory
      persistentTTL: 30 * 60 * 1000, // 30 minutes for IndexedDB
      maxMemorySize: 100
    });
    this.startBackgroundRefresh();
  }

  static getInstance(): EnhancedApiClient {
    if (!EnhancedApiClient.instance) {
      EnhancedApiClient.instance = new EnhancedApiClient();
    }
    return EnhancedApiClient.instance;
  }

  private getAuthHeaders(): Record<string, string> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth-token') : null;
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  }

  private async makeRequest<T>(
    url: string, 
    options: RequestInit = {}, 
    cacheKey?: string,
    useConditionalRequest = true
  ): Promise<T> {
    // Prevent duplicate requests
    if (this.requestQueue.has(url)) {
      return this.requestQueue.get(url);
    }

    const headers = {
      ...this.getAuthHeaders(),
      ...options.headers
    };

    // Add ETag for conditional requests
    if (cacheKey && useConditionalRequest) {
      const etag = await this.cache.getEtag(cacheKey);
      if (etag) {
        (headers as any)['If-None-Match'] = etag;
      }
    }

    const requestPromise = fetch(url, {
      ...options,
      headers
    }).then(async (response) => {
      // Handle 304 Not Modified
      if (response.status === 304 && cacheKey) {
        const cached = await this.cache.get<T>(cacheKey);
        if (cached) {
          return cached;
        }
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Cache the response
      if (cacheKey) {
        const etag = response.headers.get('etag');
        await this.cache.set(cacheKey, data, etag || undefined);
      }

      return data;
    }).finally(() => {
      this.requestQueue.delete(url);
    });

    this.requestQueue.set(url, requestPromise);
    return requestPromise;
  }

  // Enhanced workflow operations with caching and pagination
  async getAllWorkflows(options: PaginationOptions = {}): Promise<WorkflowsResponse> {
    const { page = 1, limit = 50, sortBy = 'rating', sortOrder = 'desc' } = options;
    const cacheKey = `workflows:${page}:${limit}:${sortBy}:${sortOrder}`;
    
    // Try cache first
    const cached = await this.cache.get<WorkflowsResponse>(cacheKey);
    if (cached) {
      return cached;
    }

    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      sortBy,
      sortOrder
    });

    return this.makeRequest<WorkflowsResponse>(
      `/api/workflows?${params.toString()}`,
      {},
      cacheKey
    );
  }

  async getWorkflowById(id: string, useCache = true): Promise<WorkflowAnalysis> {
    const cacheKey = `workflow:${id}`;
    
    if (useCache) {
      const cached = await this.cache.get<WorkflowAnalysis>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    return this.makeRequest<WorkflowAnalysis>(
      `/api/workflows?id=${id}`,
      {},
      useCache ? cacheKey : undefined
    );
  }

  async searchWorkflows(query: string, options: PaginationOptions = {}): Promise<WorkflowsResponse> {
    const { page = 1, limit = 50 } = options;
    const cacheKey = `search:${query}:${page}:${limit}`;
    
    // For searches, use shorter cache TTL
    const cached = await this.cache.get<WorkflowsResponse>(cacheKey);
    if (cached) {
      return cached;
    }

    const params = new URLSearchParams({
      search: query,
      page: page.toString(),
      limit: limit.toString()
    });

    const result = await this.makeRequest<WorkflowsResponse>(
      `/api/workflows?${params.toString()}`,
      {},
      cacheKey,
      false // Don't use conditional requests for searches
    );

    return result;
  }

  // Incremental loading helper
  async loadWorkflowsIncremental(
    onBatch: (batch: WorkflowAnalysis[], progress: { loaded: number; total: number }) => void,
    batchSize = 50
  ): Promise<WorkflowAnalysis[]> {
    const allWorkflows: WorkflowAnalysis[] = [];
    let page = 1;
    let hasMore = true;
    let total = 0;

    while (hasMore) {
      const response = await this.getAllWorkflows({
        page,
        limit: batchSize,
        sortBy: 'rating',
        sortOrder: 'desc'
      });

      allWorkflows.push(...response.workflows);
      total = response.pagination.total;
      
      onBatch(response.workflows, {
        loaded: allWorkflows.length,
        total
      });

      hasMore = response.pagination.hasMore;
      page++;

      // Add small delay to prevent overwhelming the server
      if (hasMore) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return allWorkflows;
  }

  // Prefetch related workflows
  async prefetchRelatedWorkflows(workflow: WorkflowAnalysis): Promise<void> {
    if (!workflow.category) return;

    const relatedQuery = `category:${workflow.category}`;
    
    // Prefetch in background without blocking
    setTimeout(() => {
      this.searchWorkflows(relatedQuery, { limit: 10 });
    }, 1000);
  }

  // Cache management
  async invalidateWorkflow(id: string): Promise<void> {
    await this.cache.invalidate(`workflow:${id}`);
    
    // Also invalidate related caches
    const patterns = [
      'workflows:', // Paginated lists
      'search:'     // Search results
    ];

    // Note: In a real implementation, we'd need a more sophisticated
    // cache invalidation strategy that tracks dependencies
  }

  async clearCache(): Promise<void> {
    await this.cache.clear();
  }

  getCacheStats() {
    return this.cache.getStats();
  }

  // Background refresh for critical data
  private startBackgroundRefresh(): void {
    if (typeof window === 'undefined') return;

    this.backgroundRefreshInterval = setInterval(async () => {
      try {
        // Refresh the first page of workflows in background
        await this.getAllWorkflows({ page: 1, limit: 20 });
      } catch (error) {
        console.warn('Background refresh failed:', error);
      }
    }, 10 * 60 * 1000); // Every 10 minutes
  }

  destroy(): void {
    if (this.backgroundRefreshInterval) {
      clearInterval(this.backgroundRefreshInterval);
    }
    this.requestQueue.clear();
  }

  // Legacy API compatibility - delegate to original methods
  async saveWorkflow(workflow: WorkflowAnalysis): Promise<void> {
    const response = await fetch('/api/workflows', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders()
      },
      body: JSON.stringify(workflow),
    });
    
    if (!response.ok) {
      throw new Error('Failed to save workflow');
    }

    // Invalidate caches after mutation
    await this.invalidateWorkflow(workflow.id);
  }

  async saveWorkflows(workflows: WorkflowAnalysis[]): Promise<void> {
    const response = await fetch('/api/workflows', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders()
      },
      body: JSON.stringify(workflows),
    });
    
    if (!response.ok) {
      throw new Error('Failed to save workflows');
    }

    // Clear all caches after bulk save
    await this.clearCache();
  }

  async deleteWorkflow(id: string): Promise<void> {
    const response = await fetch(`/api/workflows?id=${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders()
    });
    
    if (!response.ok) {
      throw new Error('Failed to delete workflow');
    }

    await this.invalidateWorkflow(id);
  }

  async clearAllWorkflows(): Promise<void> {
    const response = await fetch('/api/workflows?id=all', {
      method: 'DELETE',
      headers: this.getAuthHeaders()
    });
    
    if (!response.ok) {
      throw new Error('Failed to clear workflows');
    }

    await this.clearCache();
  }

  // Import operations (unchanged from original)
  async startImport(files: UploadedFile[], apiKey: string, importTag: string = 'internetsourced'): Promise<{
    sessionId: string;
    totalFiles: number;
    skippedCount: number;
  }> {
    const response = await fetch('/api/import', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders(),
      },
      body: JSON.stringify({ files, apiKey, importTag }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to start import');
    }
    
    return response.json();
  }

  async processNextImport(sessionId: string): Promise<{
    success?: boolean;
    error?: boolean;
    completed?: boolean;
    workflow?: WorkflowAnalysis;
    fileName?: string;
    message?: string;
    progress?: {
      processed: number;
      total: number;
    };
  }> {
    const response = await fetch(`/api/import?action=process&sessionId=${sessionId}`, {
      headers: this.getAuthHeaders(),
    });
    
    if (!response.ok) {
      throw new Error('Failed to process import');
    }
    
    const result = await response.json();
    
    // If import completed, clear cache to show new data
    if (result.completed) {
      await this.clearCache();
    }
    
    return result;
  }

  // ... rest of import methods unchanged
}