import { WorkflowAnalysis } from '@/types/workflow';

// Custom event system for workflow updates
class WorkflowEventManager {
  private static instance: WorkflowEventManager;
  private listeners: Map<string, ((data: any) => void)[]> = new Map();

  static getInstance(): WorkflowEventManager {
    if (!WorkflowEventManager.instance) {
      WorkflowEventManager.instance = new WorkflowEventManager();
    }
    return WorkflowEventManager.instance;
  }

  // Subscribe to events
  on(event: string, callback: (data: any) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    
    this.listeners.get(event)!.push(callback);
    
    // Return unsubscribe function
    return () => {
      const callbacks = this.listeners.get(event);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  }

  // Emit events
  emit(event: string, data: any): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => callback(data));
    }
  }

  // Clear all listeners
  clear(): void {
    this.listeners.clear();
  }
}

export const workflowEvents = WorkflowEventManager.getInstance();

// Event types
export const WORKFLOW_EVENTS = {
  WORKFLOW_ADDED: 'workflow_added',
  WORKFLOW_UPDATED: 'workflow_updated',
  WORKFLOW_DELETED: 'workflow_deleted',
  WORKFLOWS_CLEARED: 'workflows_cleared',
  IMPORT_STARTED: 'import_started',
  IMPORT_COMPLETED: 'import_completed',
} as const;

// Event data types
export interface WorkflowAddedEvent {
  workflow: WorkflowAnalysis;
}

export interface WorkflowUpdatedEvent {
  workflow: WorkflowAnalysis;
}

export interface WorkflowDeletedEvent {
  workflowId: string;
}

export interface ImportStartedEvent {
  totalFiles: number;
}

export interface ImportCompletedEvent {
  totalProcessed: number;
  totalFailed: number;
  totalSkipped: number;
}