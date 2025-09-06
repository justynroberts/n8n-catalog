import { UploadedFile, WorkflowAnalysis, N8nWorkflow } from '@/types/workflow';
import { WorkflowParser } from './workflow-parser';
import { AIAnalyzer } from './ai-analyzer';
import { WorkflowStorage } from './storage';

interface QueueItem {
  id: string;
  file: UploadedFile;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
  result?: WorkflowAnalysis;
  timestamp: number;
}

interface ImportQueueState {
  items: QueueItem[];
  isProcessing: boolean;
  currentIndex: number;
  apiKey: string;
  startTime: number;
  lastUpdate: number;
}

const QUEUE_STORAGE_KEY = 'n8n-import-queue';
const STATE_STORAGE_KEY = 'n8n-import-state';

export class ImportQueue {
  private static instance: ImportQueue;
  private state: ImportQueueState | null = null;
  private storage: WorkflowStorage;
  private processingInterval: NodeJS.Timeout | null = null;
  private onProgressCallback?: (current: number, total: number, message: string) => void;
  private onCompleteCallback?: () => void;
  private onNewWorkflowCallback?: (workflow: WorkflowAnalysis) => void;

  private constructor() {
    this.storage = WorkflowStorage.getInstance();
    this.loadState();
  }

  static getInstance(): ImportQueue {
    if (!ImportQueue.instance) {
      ImportQueue.instance = new ImportQueue();
    }
    return ImportQueue.instance;
  }

  private loadState(): void {
    try {
      const savedState = localStorage.getItem(STATE_STORAGE_KEY);
      if (savedState) {
        this.state = JSON.parse(savedState);
        // Check if state is not too old (24 hours)
        if (this.state && this.state.lastUpdate) {
          const age = Date.now() - this.state.lastUpdate;
          if (age > 24 * 60 * 60 * 1000) {
            this.clearQueue();
          } else if (this.state.isProcessing) {
            // Resume processing if it was interrupted
            this.resumeProcessing();
          }
        }
      }
    } catch (e) {
      console.error('Failed to load import queue state:', e);
      this.clearQueue();
    }
  }

  private saveState(): void {
    if (this.state) {
      this.state.lastUpdate = Date.now();
      localStorage.setItem(STATE_STORAGE_KEY, JSON.stringify(this.state));
    }
  }

  public addFiles(files: UploadedFile[], apiKey: string): number {
    const workflowStorage = WorkflowStorage.getInstance();
    
    // Filter out already catalogued files
    const newFiles = files.filter(file => {
      const cached = workflowStorage.isWorkflowCached(file.name, file.path);
      return !cached;
    });

    if (newFiles.length === 0) {
      return 0;
    }

    // Create queue items
    const items: QueueItem[] = newFiles.map(file => ({
      id: Math.random().toString(36).substring(2, 15),
      file,
      status: 'pending' as const,
      timestamp: Date.now()
    }));

    // Initialize or update state
    if (!this.state || !this.state.isProcessing) {
      this.state = {
        items,
        isProcessing: false,
        currentIndex: 0,
        apiKey,
        startTime: Date.now(),
        lastUpdate: Date.now()
      };
    } else {
      // Add to existing queue
      this.state.items.push(...items);
    }

    this.saveState();
    this.startProcessing();
    return newFiles.length;
  }

  private async startProcessing(): Promise<void> {
    if (!this.state || this.state.isProcessing) {
      return;
    }

    this.state.isProcessing = true;
    this.saveState();

    // Process items one by one
    await this.processNext();
  }

  private async processNext(): Promise<void> {
    if (!this.state) return;

    const pendingItems = this.state.items.filter(item => item.status === 'pending');
    
    if (pendingItems.length === 0) {
      // All done
      this.completeProcessing();
      return;
    }

    const currentItem = pendingItems[0];
    currentItem.status = 'processing';
    this.saveState();

    // Calculate progress
    const completed = this.state.items.filter(item => 
      item.status === 'completed' || item.status === 'failed'
    ).length;
    const total = this.state.items.length;
    
    if (this.onProgressCallback) {
      this.onProgressCallback(completed, total, `Processing: ${currentItem.file.name}`);
    }

    try {
      // Parse workflow
      const workflowData = WorkflowParser.parseWorkflowFile(currentItem.file.content || '', currentItem.file.path);
      
      if (!workflowData) {
        throw new Error('Invalid workflow format');
      }

      // Analyze with AI
      const analyzer = new AIAnalyzer(this.state.apiKey);
      const analysis = await analyzer.analyzeWorkflow(workflowData, currentItem.file.path);
      
      // Save to storage immediately
      this.storage.saveWorkflows([analysis]);
      
      // Update item status
      currentItem.status = 'completed';
      currentItem.result = analysis;
      
      // Notify about new workflow
      if (this.onNewWorkflowCallback) {
        this.onNewWorkflowCallback(analysis);
      }
    } catch (error) {
      console.error(`Failed to process ${currentItem.file.name}:`, error);
      currentItem.status = 'failed';
      currentItem.error = error instanceof Error ? error.message : 'Unknown error';
    }

    this.saveState();

    // Process next item after a small delay
    setTimeout(() => this.processNext(), 100);
  }

  private completeProcessing(): void {
    if (!this.state) return;

    this.state.isProcessing = false;
    this.saveState();

    const completed = this.state.items.filter(item => item.status === 'completed').length;
    const failed = this.state.items.filter(item => item.status === 'failed').length;
    
    if (this.onProgressCallback) {
      this.onProgressCallback(
        this.state.items.length, 
        this.state.items.length, 
        `Import completed: ${completed} successful, ${failed} failed`
      );
    }

    if (this.onCompleteCallback) {
      this.onCompleteCallback();
    }

    // Clear queue after a delay
    setTimeout(() => this.clearQueue(), 5000);
  }

  private resumeProcessing(): void {
    if (!this.state) return;
    
    // Reset any items that were processing (they were interrupted)
    this.state.items.forEach(item => {
      if (item.status === 'processing') {
        item.status = 'pending';
      }
    });
    
    this.state.isProcessing = false;
    this.saveState();
    
    // Restart processing
    this.startProcessing();
  }

  public clearQueue(): void {
    this.state = null;
    localStorage.removeItem(STATE_STORAGE_KEY);
    
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
  }

  public getState(): ImportQueueState | null {
    return this.state;
  }

  public isActive(): boolean {
    return this.state !== null && this.state.isProcessing;
  }

  public getProgress(): { current: number; total: number; percentage: number } {
    if (!this.state) {
      return { current: 0, total: 0, percentage: 0 };
    }

    const completed = this.state.items.filter(item => 
      item.status === 'completed' || item.status === 'failed'
    ).length;
    const total = this.state.items.length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { current: completed, total, percentage };
  }

  public onProgress(callback: (current: number, total: number, message: string) => void): void {
    this.onProgressCallback = callback;
  }

  public onComplete(callback: () => void): void {
    this.onCompleteCallback = callback;
  }

  public onNewWorkflow(callback: (workflow: WorkflowAnalysis) => void): void {
    this.onNewWorkflowCallback = callback;
  }

  public getCompletedWorkflows(): WorkflowAnalysis[] {
    if (!this.state) return [];
    
    return this.state.items
      .filter(item => item.status === 'completed' && item.result)
      .map(item => item.result!)
      .filter(Boolean);
  }
}