import { ApiClient } from './api-client';
import { WorkflowAnalysis, UploadedFile } from '@/types/workflow';
import { workflowEvents, WORKFLOW_EVENTS } from './workflow-events';

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

export class SQLiteImportProcessor {
  private static instance: SQLiteImportProcessor;
  private api = ApiClient.getInstance();
  private processingInterval: NodeJS.Timeout | null = null;
  private currentSessionId: string | null = null;
  private progressCallbacks: ((progress: ImportProgress) => void)[] = [];

  private constructor() {
    // Check for active session on startup
    this.checkActiveSession();
  }

  static getInstance(): SQLiteImportProcessor {
    if (!SQLiteImportProcessor.instance) {
      SQLiteImportProcessor.instance = new SQLiteImportProcessor();
    }
    return SQLiteImportProcessor.instance;
  }

  private async checkActiveSession(): Promise<void> {
    try {
      const activeSession = await this.api.getActiveImportSession();
      if (activeSession && activeSession.status === 'active') {
        console.log('Resuming active import session:', activeSession.id);
        this.currentSessionId = activeSession.id;
        this.startProcessing();
      }
    } catch (error) {
      console.warn('No active session found or error checking:', error);
    }
  }

  async startImport(files: UploadedFile[], apiKey: string, importTag: string = 'internetsourced'): Promise<string> {
    try {
      const result = await this.api.startImport(files, apiKey, importTag);
      this.currentSessionId = result.sessionId;
      
      workflowEvents.emit(WORKFLOW_EVENTS.IMPORT_STARTED, {
        totalFiles: result.totalFiles
      });

      // Start processing
      this.startProcessing();
      
      return result.sessionId;
    } catch (error) {
      throw error;
    }
  }

  private startProcessing(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }

    this.processingInterval = setInterval(async () => {
      await this.processNext();
    }, 1000); // Process every 1 second
  }

  private async processNext(): Promise<void> {
    if (!this.currentSessionId) {
      this.stopProcessing();
      return;
    }

    try {
      const result = await this.api.processNextImport(this.currentSessionId);
      
      if (result.completed) {
        // Import completed
        this.completeImport();
        return;
      }

      if (result.success && result.workflow) {
        // Successfully processed a workflow
        workflowEvents.emit(WORKFLOW_EVENTS.WORKFLOW_ADDED, {
          workflow: result.workflow
        });
        
        this.emitProgress(result.fileName, result.progress);
      } else if (result.error) {
        // Failed to process a file
        console.error(`Failed to process ${result.fileName}:`, result.message);
        this.emitProgress(result.fileName, result.progress);
      }

    } catch (error) {
      console.error('Error processing import:', error);
      this.stopProcessing();
    }
  }

  private async completeImport(): Promise<void> {
    this.stopProcessing();
    
    if (this.currentSessionId) {
      try {
        const session = await this.api.getImportSession(this.currentSessionId);
        
        workflowEvents.emit(WORKFLOW_EVENTS.IMPORT_COMPLETED, {
          totalProcessed: session.processed_files,
          totalFailed: session.failed_files,
          totalSkipped: session.skipped_files
        });
        
        // Final progress update
        this.emitProgress(undefined, {
          processed: session.processed_files,
          total: session.total_files
        }, false);
        
      } catch (error) {
        console.error('Error getting final session state:', error);
      }
    }
    
    this.currentSessionId = null;
  }

  private stopProcessing(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
  }

  private emitProgress(currentFile?: string, progress?: { processed: number; total: number }, isActive: boolean = true): void {
    if (!this.currentSessionId || !progress) return;

    const percentage = progress.total > 0
      ? Math.round((progress.processed / progress.total) * 100)
      : 0;

    const progressData: ImportProgress = {
      sessionId: this.currentSessionId,
      total: progress.total,
      processed: progress.processed,
      failed: 0, // This would need to be tracked separately
      skipped: 0, // This would need to be tracked separately
      currentFile,
      isActive,
      percentage
    };

    this.progressCallbacks.forEach(callback => callback(progressData));
  }

  async getProgress(): Promise<ImportProgress | null> {
    if (!this.currentSessionId) {
      return null;
    }

    try {
      const session = await this.api.getImportSession(this.currentSessionId);
      
      const percentage = session.total_files > 0
        ? Math.round((session.processed_files / session.total_files) * 100)
        : 0;

      return {
        sessionId: this.currentSessionId,
        total: session.total_files,
        processed: session.processed_files,
        failed: session.failed_files,
        skipped: session.skipped_files,
        isActive: session.status === 'active',
        percentage
      };
    } catch (error) {
      console.error('Error getting progress:', error);
      return null;
    }
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

  async getAllWorkflows(): Promise<WorkflowAnalysis[]> {
    const result = await this.api.getAllWorkflows();
    return result.workflows;
  }

  async clearAllData(): Promise<void> {
    await this.api.clearAllWorkflows();
    this.stopProcessing();
    this.currentSessionId = null;
  }
}