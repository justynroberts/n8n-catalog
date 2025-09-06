import Dexie, { Table } from 'dexie';
import { WorkflowAnalysis, UploadedFile } from '@/types/workflow';

interface ImportQueueItem {
  id?: string;
  fileName: string;
  filePath?: string;
  fileContent: string;
  fileSize: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  errorMessage?: string;
  workflowId?: string;
  createdAt: Date;
  processedAt?: Date;
  sessionId: string;
}

interface ImportSession {
  id?: string;
  totalFiles: number;
  processedFiles: number;
  failedFiles: number;
  skippedFiles: number;
  status: 'active' | 'completed' | 'cancelled';
  apiKey: string;
  startedAt: Date;
  completedAt?: Date;
  lastUpdate: Date;
}

interface StoredWorkflow extends WorkflowAnalysis {
  createdAt?: Date;
  updatedAt?: Date;
}

class CatalogDatabase extends Dexie {
  workflows!: Table<StoredWorkflow>;
  importQueue!: Table<ImportQueueItem>;
  importSessions!: Table<ImportSession>;

  constructor() {
    super('n8nCatalogDB');
    
    this.version(1).stores({
      workflows: 'id, name, category, complexity, [category+complexity], createdAt, updatedAt',
      importQueue: '++id, fileName, status, sessionId, createdAt',
      importSessions: '++id, status, startedAt'
    });
  }

  // Workflow operations
  async saveWorkflow(workflow: WorkflowAnalysis): Promise<void> {
    const storedWorkflow: StoredWorkflow = {
      ...workflow,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await this.workflows.put(storedWorkflow);
  }

  async saveWorkflows(workflows: WorkflowAnalysis[]): Promise<void> {
    const storedWorkflows: StoredWorkflow[] = workflows.map(w => ({
      ...w,
      createdAt: new Date(),
      updatedAt: new Date()
    }));
    
    await this.workflows.bulkPut(storedWorkflows);
  }

  async getAllWorkflows(): Promise<WorkflowAnalysis[]> {
    return await this.workflows.toArray();
  }

  async getWorkflowById(id: string): Promise<WorkflowAnalysis | undefined> {
    return await this.workflows.get(id);
  }

  async searchWorkflows(query: string): Promise<WorkflowAnalysis[]> {
    const lowercaseQuery = query.toLowerCase();
    return await this.workflows
      .filter(workflow => 
        workflow.name.toLowerCase().includes(lowercaseQuery) ||
        workflow.description.toLowerCase().includes(lowercaseQuery) ||
        workflow.category.toLowerCase().includes(lowercaseQuery) ||
        workflow.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery))
      )
      .toArray();
  }

  async deleteWorkflow(id: string): Promise<void> {
    await this.workflows.delete(id);
  }

  async clearAllWorkflows(): Promise<void> {
    await this.workflows.clear();
  }

  async isWorkflowCached(name: string, filePath?: string): Promise<boolean> {
    const existing = await this.workflows
      .where('name')
      .equals(name)
      .first();
    
    if (!existing) return false;
    
    // Check if it's the same file path if provided
    if (filePath && existing.filePath !== filePath) {
      return false;
    }
    
    // Check if analysis is recent (within 24 hours)
    const analysisDate = new Date(existing.lastAnalyzed);
    const oneDayAgo = new Date();
    oneDayAgo.setHours(oneDayAgo.getHours() - 24);
    
    return analysisDate > oneDayAgo;
  }

  // Import queue operations
  async addToImportQueue(
    file: UploadedFile,
    sessionId: string
  ): Promise<string> {
    const id = Math.random().toString(36).substring(2, 15);
    
    const queueItem: ImportQueueItem = {
      id,
      fileName: file.name,
      filePath: file.path,
      fileContent: file.content || '',
      fileSize: file.size,
      status: 'pending',
      createdAt: new Date(),
      sessionId
    };
    
    await this.importQueue.add(queueItem);
    return id;
  }

  async addMultipleToQueue(
    files: UploadedFile[],
    sessionId: string
  ): Promise<void> {
    const queueItems: ImportQueueItem[] = files.map(file => ({
      fileName: file.name,
      filePath: file.path,
      fileContent: file.content || '',
      fileSize: file.size,
      status: 'pending',
      createdAt: new Date(),
      sessionId
    }));
    
    await this.importQueue.bulkAdd(queueItems);
  }

  async getNextPendingImport(sessionId: string): Promise<ImportQueueItem | undefined> {
    return await this.importQueue
      .where('sessionId')
      .equals(sessionId)
      .and(item => item.status === 'pending')
      .first();
  }

  async updateImportStatus(
    id: string,
    status: 'processing' | 'completed' | 'failed',
    workflowId?: string,
    errorMessage?: string
  ): Promise<void> {
    await this.importQueue.update(id, {
      status,
      workflowId,
      errorMessage,
      processedAt: new Date()
    });
  }

  async getPendingImportsCount(sessionId: string): Promise<number> {
    return await this.importQueue
      .where('sessionId')
      .equals(sessionId)
      .and(item => item.status === 'pending')
      .count();
  }

  async clearImportQueue(): Promise<void> {
    await this.importQueue.clear();
  }

  async getSessionImports(sessionId: string): Promise<ImportQueueItem[]> {
    return await this.importQueue
      .where('sessionId')
      .equals(sessionId)
      .toArray();
  }

  // Import session operations
  async createImportSession(
    totalFiles: number,
    apiKey: string
  ): Promise<string> {
    const session: ImportSession = {
      totalFiles,
      processedFiles: 0,
      failedFiles: 0,
      skippedFiles: 0,
      status: 'active',
      apiKey,
      startedAt: new Date(),
      lastUpdate: new Date()
    };
    
    const id = await this.importSessions.add(session);
    return String(id);
  }

  async updateImportSession(
    id: string,
    updates: Partial<ImportSession>
  ): Promise<void> {
    await this.importSessions.update(id, {
      ...updates,
      lastUpdate: new Date()
    });
  }

  async incrementSessionProgress(
    id: string,
    success: boolean
  ): Promise<void> {
    const session = await this.importSessions.get(id);
    if (session) {
      await this.importSessions.update(id, {
        processedFiles: session.processedFiles + 1,
        failedFiles: success ? session.failedFiles : session.failedFiles + 1,
        lastUpdate: new Date()
      });
    }
  }

  async completeImportSession(id: string): Promise<void> {
    await this.importSessions.update(id, {
      status: 'completed',
      completedAt: new Date(),
      lastUpdate: new Date()
    });
  }

  async getActiveImportSession(): Promise<ImportSession | undefined> {
    return await this.importSessions
      .where('status')
      .equals('active')
      .reverse()
      .first();
  }

  async getImportSession(id: string): Promise<ImportSession | undefined> {
    return await this.importSessions.get(id);
  }

  async clearOldSessions(): Promise<void> {
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    
    const oldSessions = await this.importSessions
      .where('lastUpdate')
      .below(oneDayAgo)
      .toArray();
    
    for (const session of oldSessions) {
      if (session.id) {
        // Clear related queue items
        await this.importQueue
          .where('sessionId')
          .equals(String(session.id))
          .delete();
        
        // Delete the session
        await this.importSessions.delete(session.id);
      }
    }
  }
}

// Singleton instance
let dbInstance: CatalogDatabase | null = null;

export function getDatabase(): CatalogDatabase {
  if (!dbInstance) {
    // Only create database on client side
    if (typeof window !== 'undefined' && window.indexedDB) {
      dbInstance = new CatalogDatabase();
    } else {
      // Return a mock database for SSR
      throw new Error('IndexedDB is not available');
    }
  }
  return dbInstance;
}

export type { ImportQueueItem, ImportSession, StoredWorkflow };
export { CatalogDatabase };