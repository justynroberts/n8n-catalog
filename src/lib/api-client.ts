import { WorkflowAnalysis, UploadedFile } from '@/types/workflow';

export class ApiClient {
  private static instance: ApiClient;

  static getInstance(): ApiClient {
    if (!ApiClient.instance) {
      ApiClient.instance = new ApiClient();
    }
    return ApiClient.instance;
  }

  private getAuthHeaders(): Record<string, string> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth-token') : null;
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  }

  // Workflow operations
  async getAllWorkflows(limit: number = 1000): Promise<{workflows: WorkflowAnalysis[], total: number}> {
    // For better UX, load a reasonable number of workflows (1000) by default
    // This gives users quick access to a large subset without waiting for all 6k+
    const response = await fetch(`/api/workflows?page=1&limit=${limit}`, {
      headers: this.getAuthHeaders()
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch workflows');
    }
    
    const data = await response.json();
    console.log(`Loaded ${data.workflows?.length || 0} workflows out of ${data.pagination?.total || 0} total`);
    
    // Handle both paginated and non-paginated responses
    if (data.pagination) {
      return {
        workflows: data.workflows || [],
        total: data.pagination.total || 0
      };
    } else {
      // Non-paginated response (backward compatibility)
      return {
        workflows: data || [],
        total: (data || []).length
      };
    }
  }

  async getWorkflowById(id: string): Promise<WorkflowAnalysis> {
    const response = await fetch(`/api/workflows?id=${id}`, {
      headers: this.getAuthHeaders()
    });
    if (!response.ok) {
      throw new Error('Failed to fetch workflow');
    }
    return response.json();
  }

  async searchWorkflows(query: string): Promise<WorkflowAnalysis[]> {
    const response = await fetch(`/api/workflows?search=${encodeURIComponent(query)}`, {
      headers: this.getAuthHeaders()
    });
    if (!response.ok) {
      throw new Error('Failed to search workflows');
    }
    const data = await response.json();
    // Handle both paginated and non-paginated responses
    return data.workflows || data;
  }

  async saveWorkflow(workflow: WorkflowAnalysis): Promise<void> {
    const response = await fetch('/api/workflows', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(workflow),
    });
    
    if (!response.ok) {
      throw new Error('Failed to save workflow');
    }
  }

  async saveWorkflows(workflows: WorkflowAnalysis[]): Promise<void> {
    const response = await fetch('/api/workflows', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(workflows),
    });
    
    if (!response.ok) {
      throw new Error('Failed to save workflows');
    }
  }

  async deleteWorkflow(id: string): Promise<void> {
    const response = await fetch(`/api/workflows?id=${id}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      throw new Error('Failed to delete workflow');
    }
  }

  async clearAllWorkflows(): Promise<void> {
    const response = await fetch('/api/workflows?id=all', {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      throw new Error('Failed to clear workflows');
    }
  }

  // Import operations
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
    
    return response.json();
  }

  async getImportSession(sessionId: string): Promise<any> {
    const response = await fetch(`/api/import?sessionId=${sessionId}`, {
      headers: this.getAuthHeaders(),
    });
    
    if (!response.ok) {
      throw new Error('Failed to get import session');
    }
    
    return response.json();
  }

  async getActiveImportSession(): Promise<any> {
    // Only make API calls on the client side
    if (typeof window === 'undefined') {
      return null;
    }
    
    const response = await fetch(`${window.location.origin}/api/import`, {
      headers: this.getAuthHeaders(),
    });
    
    if (!response.ok) {
      throw new Error('Failed to get active import session');
    }
    
    return response.json();
  }

  async cancelImport(sessionId: string): Promise<void> {
    if (typeof window === 'undefined') {
      return;
    }
    
    const response = await fetch(`${window.location.origin}/api/import?action=cancel&sessionId=${sessionId}`, {
      headers: this.getAuthHeaders(),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to cancel import');
    }
  }

  async getImportStatus(sessionId?: string): Promise<{
    sessionId: string;
    totalFiles: number;
    processedFiles: number;
    currentFile: string;
    isComplete: boolean;
    hasError: boolean;
    errorMessage?: string;
  } | null> {
    if (typeof window === 'undefined') {
      return null;
    }
    
    try {
      const url = sessionId 
        ? `${window.location.origin}/api/import?action=status&sessionId=${sessionId}`
        : `${window.location.origin}/api/import?action=status`;
        
      const response = await fetch(url, {
        headers: this.getAuthHeaders(),
      });
      
      if (!response.ok) {
        return null; // No active import
      }
      
      return response.json();
    } catch (error) {
      console.warn('Failed to get import status:', error);
      return null;
    }
  }
}