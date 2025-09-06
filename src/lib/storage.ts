import { WorkflowAnalysis } from '@/types/workflow';
import { workflowEvents, WORKFLOW_EVENTS, WorkflowAddedEvent } from './workflow-events';

const STORAGE_KEY = 'n8n-catalog-workflows';
const CACHE_VERSION = '1.0';

interface StorageData {
  version: string;
  workflows: WorkflowAnalysis[];
  lastUpdated: string;
}

export class WorkflowStorage {
  private static instance: WorkflowStorage;
  private data: StorageData;

  private constructor() {
    this.data = this.loadFromStorage();
  }

  static getInstance(): WorkflowStorage {
    if (!WorkflowStorage.instance) {
      WorkflowStorage.instance = new WorkflowStorage();
    }
    return WorkflowStorage.instance;
  }

  private loadFromStorage(): StorageData {
    try {
      if (typeof window === 'undefined') {
        return this.getDefaultData();
      }

      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        return this.getDefaultData();
      }

      const parsed = JSON.parse(stored) as StorageData;
      
      // Check version compatibility
      if (parsed.version !== CACHE_VERSION) {
        console.log('Cache version mismatch, clearing cache');
        return this.getDefaultData();
      }

      return parsed;
    } catch (error) {
      console.error('Failed to load from storage:', error);
      return this.getDefaultData();
    }
  }

  private getDefaultData(): StorageData {
    return {
      version: CACHE_VERSION,
      workflows: [],
      lastUpdated: new Date().toISOString()
    };
  }

  private saveToStorage(): void {
    try {
      if (typeof window === 'undefined') return;

      this.data.lastUpdated = new Date().toISOString();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch (error) {
      console.error('Failed to save to storage:', error);
      
      // If storage is full, try to free up space
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        this.clearOldWorkflows();
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
        } catch (retryError) {
          console.error('Failed to save even after cleanup:', retryError);
        }
      }
    }
  }

  getAllWorkflows(): WorkflowAnalysis[] {
    return [...this.data.workflows];
  }

  getWorkflowById(id: string): WorkflowAnalysis | null {
    return this.data.workflows.find(w => w.id === id) || null;
  }

  getWorkflowByName(name: string): WorkflowAnalysis | null {
    return this.data.workflows.find(w => w.name === name) || null;
  }

  saveWorkflow(workflow: WorkflowAnalysis): void {
    const existingIndex = this.data.workflows.findIndex(w => w.id === workflow.id);
    
    if (existingIndex >= 0) {
      this.data.workflows[existingIndex] = workflow;
    } else {
      this.data.workflows.push(workflow);
    }
    
    this.saveToStorage();
  }

  saveWorkflows(workflows: WorkflowAnalysis[]): void {
    // Merge with existing workflows, updating duplicates
    const workflowMap = new Map<string, WorkflowAnalysis>();
    
    // Add existing workflows
    this.data.workflows.forEach(w => workflowMap.set(w.id, w));
    
    // Add/update new workflows
    workflows.forEach(w => workflowMap.set(w.id, w));
    
    this.data.workflows = Array.from(workflowMap.values());
    this.saveToStorage();
  }

  deleteWorkflow(id: string): boolean {
    const initialLength = this.data.workflows.length;
    this.data.workflows = this.data.workflows.filter(w => w.id !== id);
    
    if (this.data.workflows.length < initialLength) {
      this.saveToStorage();
      return true;
    }
    
    return false;
  }

  clearAllWorkflows(): void {
    this.data.workflows = [];
    this.saveToStorage();
  }

  getWorkflowsByCategory(category: string): WorkflowAnalysis[] {
    return this.data.workflows.filter(w => w.category === category);
  }

  getWorkflowsByTag(tag: string): WorkflowAnalysis[] {
    return this.data.workflows.filter(w => w.tags.includes(tag));
  }

  getWorkflowsByComplexity(complexity: 'Simple' | 'Medium' | 'Complex'): WorkflowAnalysis[] {
    return this.data.workflows.filter(w => w.complexity === complexity);
  }

  searchWorkflows(query: string): WorkflowAnalysis[] {
    const lowerQuery = query.toLowerCase();
    return this.data.workflows.filter(w => 
      w.name.toLowerCase().includes(lowerQuery) ||
      w.description.toLowerCase().includes(lowerQuery) ||
      w.category.toLowerCase().includes(lowerQuery) ||
      w.useCase.toLowerCase().includes(lowerQuery) ||
      w.tags.some(tag => tag.toLowerCase().includes(lowerQuery)) ||
      w.integrations.some(integration => integration.toLowerCase().includes(lowerQuery))
    );
  }

  getStats(): {
    totalWorkflows: number;
    categories: Record<string, number>;
    complexities: Record<string, number>;
    integrations: Record<string, number>;
    lastUpdated: string;
    storageSize: number;
  } {
    const categories: Record<string, number> = {};
    const complexities: Record<string, number> = {};
    const integrations: Record<string, number> = {};

    this.data.workflows.forEach(workflow => {
      // Count categories
      categories[workflow.category] = (categories[workflow.category] || 0) + 1;
      
      // Count complexities
      complexities[workflow.complexity] = (complexities[workflow.complexity] || 0) + 1;
      
      // Count integrations
      workflow.integrations.forEach(integration => {
        integrations[integration] = (integrations[integration] || 0) + 1;
      });
    });

    const storageSize = this.getStorageSize();

    return {
      totalWorkflows: this.data.workflows.length,
      categories,
      complexities,
      integrations,
      lastUpdated: this.data.lastUpdated,
      storageSize
    };
  }

  private getStorageSize(): number {
    try {
      if (typeof window === 'undefined') return 0;
      
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? new Blob([stored]).size : 0;
    } catch {
      return 0;
    }
  }

  private clearOldWorkflows(): void {
    // Remove workflows older than 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    this.data.workflows = this.data.workflows.filter(w => 
      new Date(w.lastAnalyzed) > thirtyDaysAgo
    );
    
    // If still too many, keep only the most recent 100
    if (this.data.workflows.length > 100) {
      this.data.workflows.sort((a, b) => 
        new Date(b.lastAnalyzed).getTime() - new Date(a.lastAnalyzed).getTime()
      );
      this.data.workflows = this.data.workflows.slice(0, 100);
    }
  }

  exportData(): string {
    return JSON.stringify(this.data, null, 2);
  }

  importData(jsonData: string): { success: boolean; imported: number; errors: string[] } {
    try {
      const parsed = JSON.parse(jsonData) as StorageData;
      const errors: string[] = [];
      let imported = 0;

      if (!parsed.workflows || !Array.isArray(parsed.workflows)) {
        return { success: false, imported: 0, errors: ['Invalid data format'] };
      }

      // Validate each workflow
      const validWorkflows: WorkflowAnalysis[] = [];
      
      parsed.workflows.forEach((workflow, index) => {
        try {
          // Basic validation
          if (!workflow.id || !workflow.name || !workflow.category) {
            errors.push(`Workflow ${index + 1}: Missing required fields`);
            return;
          }

          validWorkflows.push(workflow);
          imported++;
        } catch (error) {
          errors.push(`Workflow ${index + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      });

      // Save valid workflows
      this.saveWorkflows(validWorkflows);

      return { success: imported > 0, imported, errors };
    } catch (error) {
      return { 
        success: false, 
        imported: 0, 
        errors: [`JSON parse error: ${error instanceof Error ? error.message : 'Unknown error'}`] 
      };
    }
  }

  // Check if workflow is already cached and up to date
  isWorkflowCached(name: string, filePath?: string): WorkflowAnalysis | null {
    const workflow = this.getWorkflowByName(name);
    if (!workflow) return null;

    // If we have a file path, check if it matches
    if (filePath && workflow.filePath !== filePath) {
      return null;
    }

    // Check if analysis is recent (less than 24 hours old)
    const analysisDate = new Date(workflow.lastAnalyzed);
    const oneDayAgo = new Date();
    oneDayAgo.setHours(oneDayAgo.getHours() - 24);

    if (analysisDate < oneDayAgo) {
      return null; // Cache is stale
    }

    return workflow;
  }

  // Get workflows that need re-analysis
  getStaleWorkflows(): WorkflowAnalysis[] {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    return this.data.workflows.filter(w => 
      new Date(w.lastAnalyzed) < sevenDaysAgo
    );
  }
}