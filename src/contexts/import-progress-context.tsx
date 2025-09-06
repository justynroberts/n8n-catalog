'use client';

import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { SQLiteImportProcessor, ImportProgress as ProcessorProgress } from '@/lib/sqlite-processor';
import { WorkflowAnalysis } from '@/types/workflow';
import { workflowEvents, WORKFLOW_EVENTS } from '@/lib/workflow-events';

interface ImportProgress {
  isActive: boolean;
  current: number;
  total: number;
  message: string;
  percentage: number;
  sessionId?: string;
  failed?: number;
  skipped?: number;
}

interface ImportProgressContextType {
  progress: ImportProgress;
  setProgress: (progress: Partial<ImportProgress>) => void;
  startImport: (total: number) => void;
  updateProgress: (current: number, message?: string) => void;
  finishImport: () => void;
  recoverImport: () => boolean;
  onNewWorkflow: (callback: (workflow: WorkflowAnalysis) => void) => () => void;
}

const ImportProgressContext = createContext<ImportProgressContextType | undefined>(undefined);

export function ImportProgressProvider({ children }: { children: ReactNode }) {
  const [progress, setProgressState] = useState<ImportProgress>({
    isActive: false,
    current: 0,
    total: 0,
    message: '',
    percentage: 0
  });
  
  const [processor] = useState(() => SQLiteImportProcessor.getInstance());

  // Check for active imports on mount
  useEffect(() => {
    const checkActiveImport = async () => {
      const activeProgress = await processor.getProgress();
      if (activeProgress && activeProgress.isActive) {
        setProgressState({
          isActive: true,
          current: activeProgress.processed,
          total: activeProgress.total,
          message: activeProgress.currentFile || 'Processing...',
          percentage: activeProgress.percentage,
          sessionId: activeProgress.sessionId,
          failed: activeProgress.failed,
          skipped: activeProgress.skipped
        });
      }
    };
    
    checkActiveImport();

    // Subscribe to progress updates
    const unsubscribe = processor.onProgress((processorProgress: ProcessorProgress) => {
      setProgressState({
        isActive: processorProgress.isActive,
        current: processorProgress.processed,
        total: processorProgress.total,
        message: processorProgress.currentFile || 
          (processorProgress.isActive ? 'Processing...' : 'Import completed'),
        percentage: processorProgress.percentage,
        sessionId: processorProgress.sessionId,
        failed: processorProgress.failed,
        skipped: processorProgress.skipped
      });
      
      // Auto-dismiss after completion
      if (!processorProgress.isActive) {
        setTimeout(() => {
          setProgressState({
            isActive: false,
            current: 0,
            total: 0,
            message: '',
            percentage: 0
          });
        }, 5000);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [processor]);

  const setProgress = (updates: Partial<ImportProgress>) => {
    setProgressState(prev => {
      const newProgress = { ...prev, ...updates };
      if (newProgress.total > 0) {
        newProgress.percentage = Math.round((newProgress.current / newProgress.total) * 100);
      }
      return newProgress;
    });
  };

  const startImport = (total: number) => {
    const newProgress = {
      isActive: true,
      current: 0,
      total,
      message: 'Starting import...',
      percentage: 0
    };
    setProgressState(newProgress);
  };

  const updateProgress = (current: number, message?: string) => {
    setProgress({
      current,
      message: message || progress.message
    });
  };

  const finishImport = () => {
    setProgressState({
      isActive: false,
      current: 0,
      total: 0,
      message: '',
      percentage: 0
    });
  };

  const recoverImport = (): boolean => {
    return progress.isActive && progress.sessionId !== undefined;
  };

  const onNewWorkflow = (callback: (workflow: WorkflowAnalysis) => void): (() => void) => {
    return workflowEvents.on(WORKFLOW_EVENTS.WORKFLOW_ADDED, (data: { workflow: WorkflowAnalysis }) => {
      callback(data.workflow);
    });
  };

  return (
    <ImportProgressContext.Provider value={{
      progress,
      setProgress,
      startImport,
      updateProgress,
      finishImport,
      recoverImport,
      onNewWorkflow
    }}>
      {children}
    </ImportProgressContext.Provider>
  );
}

export function useImportProgress() {
  const context = useContext(ImportProgressContext);
  if (context === undefined) {
    throw new Error('useImportProgress must be used within an ImportProgressProvider');
  }
  return context;
}