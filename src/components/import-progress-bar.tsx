'use client';

import { useState, useEffect } from 'react';
import { X, Upload, CheckCircle, AlertCircle } from 'lucide-react';
import { ApiClient } from '@/lib/api-client';

interface ImportProgress {
  sessionId: string;
  totalFiles: number;
  processedFiles: number;
  currentFile: string;
  isComplete: boolean;
  hasError: boolean;
  errorMessage?: string;
}

export function ImportProgressBar() {
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [api] = useState(() => ApiClient.getInstance());

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    const checkForActiveImports = async () => {
      try {
        const status = await api.getImportStatus();
        if (status && status.sessionId && !status.isComplete) {
          setProgress(status);
          setIsVisible(true);
          
          // Start polling for progress
          interval = setInterval(async () => {
            try {
              const updatedStatus = await api.getImportStatus(status.sessionId);
              if (updatedStatus) {
                setProgress(updatedStatus);
                
                // Auto-hide if complete
                if (updatedStatus.isComplete) {
                  setTimeout(() => {
                    setIsVisible(false);
                    setProgress(null);
                  }, 3000); // Hide after 3 seconds
                  clearInterval(interval);
                }
              }
            } catch (error) {
              console.error('Error polling import progress:', error);
              clearInterval(interval);
            }
          }, 1000);
        }
      } catch (error) {
        console.error('Error checking for active imports:', error);
      }
    };

    // Check immediately on mount
    checkForActiveImports();

    // Check periodically for new imports
    const checkInterval = setInterval(checkForActiveImports, 5000);

    return () => {
      if (interval) clearInterval(interval);
      clearInterval(checkInterval);
    };
  }, [api]);

  const handleHide = () => {
    setIsVisible(false);
    setProgress(null);
  };

  const getProgressPercentage = () => {
    if (!progress || progress.totalFiles === 0) return 0;
    return Math.round((progress.processedFiles / progress.totalFiles) * 100);
  };

  const getStatusColor = () => {
    if (!progress) return 'bg-blue-500';
    if (progress.hasError) return 'bg-red-500';
    if (progress.isComplete) return 'bg-green-500';
    return 'bg-blue-500';
  };

  const getStatusIcon = () => {
    if (!progress) return <Upload size={16} className="animate-spin" />;
    if (progress.hasError) return <AlertCircle size={16} />;
    if (progress.isComplete) return <CheckCircle size={16} />;
    return <Upload size={16} className="animate-pulse" />;
  };

  if (!isVisible || !progress) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-[100000] bg-black/95 backdrop-blur-sm border-b border-gray-700">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 flex-1">
            <div className="flex items-center space-x-2">
              {getStatusIcon()}
              <span className="text-white font-medium">
                {progress.isComplete ? 'Import Complete' : 'Importing Workflows'}
              </span>
            </div>
            
            <div className="flex-1 max-w-md">
              <div className="flex items-center justify-between text-sm text-gray-400 mb-1">
                <span>
                  {progress.processedFiles} of {progress.totalFiles} files
                </span>
                <span>{getProgressPercentage()}%</span>
              </div>
              
              <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                <div 
                  className={`h-full transition-all duration-300 ${getStatusColor()}`}
                  style={{ width: `${getProgressPercentage()}%` }}
                />
              </div>
              
              {progress.currentFile && (
                <div className="text-xs text-gray-500 mt-1 truncate">
                  Processing: {progress.currentFile}
                </div>
              )}
              
              {progress.hasError && progress.errorMessage && (
                <div className="text-xs text-red-400 mt-1">
                  Error: {progress.errorMessage}
                </div>
              )}
            </div>
          </div>

          <button
            onClick={handleHide}
            className="text-gray-400 hover:text-white p-1"
            title="Hide progress bar"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}