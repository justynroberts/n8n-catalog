import { getDatabase, ImportSession, ImportQueueItem } from './db/indexed-db';
import { WorkflowParser } from './workflow-parser';
import { AIAnalyzer } from './ai-analyzer';
import { WorkflowAnalysis, UploadedFile } from '@/types/workflow';

export interface ImportProgress {
  sessionId: string;
  total: number;
  processed: number;
  failed: number;
  skipped: number;
  currentFile?: string;
  isActive: boolean;
  percentage: number;
}

export class ImportProcessor {
  private static instance: ImportProcessor;
  private db: ReturnType<typeof getDatabase> | null = null;
  private processingInterval: NodeJS.Timeout | null = null;
  private currentSession: ImportSession | null = null;
  private progressCallbacks: ((progress: ImportProgress) => void)[] = [];
  private newWorkflowCallbacks: ((workflow: WorkflowAnalysis) => void)[] = [];

  private constructor() {
    // Only initialize on client side
    if (typeof window !== 'undefined') {
      try {
        this.db = getDatabase();
        // Check for active sessions on startup
        this.resumeActiveSession();
      } catch (e) {
        console.warn('IndexedDB not available:', e);
      }
    }
  }

  static getInstance(): ImportProcessor {
    if (!ImportProcessor.instance) {
      ImportProcessor.instance = new ImportProcessor();
    }
    return ImportProcessor.instance;
  }

  async startImport(files: UploadedFile[], apiKey: string): Promise<string> {
    if (!this.db) {
      throw new Error('Database not available');
    }
    
    // Filter out already catalogued files
    const newFiles: UploadedFile[] = [];
    let skippedCount = 0;

    for (const file of files) {
      const isCached = await (this.db as any).isWorkflowCached(file.name, file.path);
      if (!isCached) {
        newFiles.push(file);
      } else {
        skippedCount++;
      }
    }

    if (newFiles.length === 0) {
      throw new Error('All files are already catalogued');
    }

    // Create new import session
    const sessionId = await (this.db as any).createImportSession(newFiles.length, apiKey);
    
    // Add files to queue
    await (this.db as any).addMultipleToQueue(newFiles, sessionId);
    
    // Update session with skipped count
    await (this.db as any).updateImportSession(sessionId, {
      skippedFiles: skippedCount
    });

    // Start processing
    this.startProcessing(sessionId);
    
    return sessionId;
  }

  private async startProcessing(sessionId: string): Promise<void> {
    // Load session
    const session = (this.db as any).getImportSession(sessionId);
    if (!session || session?.status !== 'active') {
      return;
    }

    this.currentSession = session;
    
    // Clear any existing interval
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }

    // Process files one by one
    this.processingInterval = setInterval(async () => {
      await this.processNext();
    }, 500); // Process every 500ms to avoid overwhelming the API
  }

  private async processNext(): Promise<void> {
    if (!this.currentSession) {
      this.stopProcessing();
      return;
    }

    // Get next pending item
    const nextItem = await (this.db as any).getNextPendingImport(String(this.currentSession?.id));
    
    if (!nextItem) {
      // No more items to process
      await this.completeSession();
      return;
    }

    // Update status to processing
    if (nextItem.id) {
      await (this.db as any).updateImportStatus(nextItem.id, 'processing');
    }

    // Emit progress
    this.emitProgress(nextItem.fileName);

    try {
      // Parse workflow
      const workflowData = WorkflowParser.parseWorkflowFile(
        nextItem.fileContent,
        nextItem.filePath
      );

      if (!workflowData) {
        throw new Error('Invalid workflow format');
      }

      // Analyze with AI
      const analyzer = new AIAnalyzer(this.currentSession?.apiKey || '');
      const analysis = await analyzer.analyzeWorkflow(workflowData, nextItem.filePath);

      // Save to database with import tag
      const importTag = (this.currentSession as any)?.import_tag || 'internetsourced';
      await (this.db as any).saveWorkflow(analysis, importTag);

      // Update import status
      if (nextItem.id) {
        await (this.db as any).updateImportStatus(nextItem.id, 'completed', analysis.id);
      }

      // Update session progress
      await (this.db as any).incrementSessionProgress(String(this.currentSession?.id), true);

      // Notify about new workflow
      this.notifyNewWorkflow(analysis);

    } catch (error) {
      console.error(`Failed to process ${nextItem.fileName}:`, error);
      
      // Update import status
      if (nextItem.id) {
        await (this.db as any).updateImportStatus(
          nextItem.id,
          'failed',
          undefined,
          error instanceof Error ? error.message : 'Unknown error'
        );
      }

      // Update session progress
      await (this.db as any).incrementSessionProgress(String(this.currentSession?.id), false);
    }

    // Reload session to get updated counts
    this.currentSession = await (this.db as any).getImportSession(String(this.currentSession?.id)) || null;
    
    // Emit updated progress
    this.emitProgress();
  }

  private async completeSession(): Promise<void> {
    if (!this.currentSession) return;

    await (this.db as any).completeImportSession(String(this.currentSession?.id));
    
    // Final progress emit
    this.emitProgress(undefined, true);
    
    // Cleanup
    this.stopProcessing();
  }

  private stopProcessing(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
    this.currentSession = null;
  }

  private async resumeActiveSession(): Promise<void> {
    const activeSession = await (this.db as any).getActiveImportSession();
    
    if (activeSession && activeSession.id) {
      // Check if session is not too old (24 hours)
      const age = Date.now() - activeSession.startedAt.getTime();
      if (age < 24 * 60 * 60 * 1000) {
        console.log('Resuming import session:', activeSession.id);
        this.startProcessing(String(activeSession.id));
      } else {
        // Session too old, mark as completed
        await (this.db as any).completeImportSession(String(activeSession.id));
      }
    }

    // Clean up old sessions
    await (this.db as any).clearOldSessions();
  }

  async getProgress(): Promise<ImportProgress | null> {
    const session = this.currentSession || await (this.db as any).getActiveImportSession();
    
    if (!session || !session.id) {
      return null;
    }

    const percentage = session.totalFiles > 0
      ? Math.round((session.processedFiles / session.totalFiles) * 100)
      : 0;

    return {
      sessionId: String(session.id),
      total: session.totalFiles,
      processed: session.processedFiles,
      failed: session.failedFiles,
      skipped: session.skippedFiles,
      isActive: session.status === 'active',
      percentage
    };
  }

  private emitProgress(currentFile?: string, isComplete: boolean = false): void {
    if (!this.currentSession || !this.currentSession?.id) return;

    const progress: ImportProgress = {
      sessionId: String(this.currentSession?.id),
      total: this.currentSession?.totalFiles || 0,
      processed: this.currentSession?.processedFiles || 0,
      failed: this.currentSession?.failedFiles || 0,
      skipped: this.currentSession?.skippedFiles || 0,
      currentFile,
      isActive: !isComplete && this.currentSession?.status === 'active',
      percentage: (this.currentSession?.totalFiles || 0) > 0
        ? Math.round(((this.currentSession?.processedFiles || 0) / (this.currentSession?.totalFiles || 1)) * 100)
        : 0
    };

    this.progressCallbacks.forEach(callback => callback(progress));
  }

  private notifyNewWorkflow(workflow: WorkflowAnalysis): void {
    this.newWorkflowCallbacks.forEach(callback => callback(workflow));
  }

  onProgress(callback: (progress: ImportProgress) => void): () => void {
    this.progressCallbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.progressCallbacks.indexOf(callback);
      if (index > -1) {
        this.progressCallbacks.splice(index, 1);
      }
    };
  }

  onNewWorkflow(callback: (workflow: WorkflowAnalysis) => void): () => void {
    this.newWorkflowCallbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.newWorkflowCallbacks.indexOf(callback);
      if (index > -1) {
        this.newWorkflowCallbacks.splice(index, 1);
      }
    };
  }

  async cancelImport(sessionId: string): Promise<void> {
    await (this.db as any).updateImportSession(sessionId, {
      status: 'cancelled'
    });
    
    if (this.currentSession && String(this.currentSession?.id) === sessionId) {
      this.stopProcessing();
    }
  }

  async getAllWorkflows(): Promise<WorkflowAnalysis[]> {
    return await (this.db as any).getAllWorkflows();
  }

  async clearAllData(): Promise<void> {
    await (this.db as any).clearAllWorkflows();
    await (this.db as any).clearImportQueue();
    this.stopProcessing();
  }
}