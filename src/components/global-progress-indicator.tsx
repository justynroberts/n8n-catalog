'use client';

import { useImportProgress } from '@/contexts/import-progress-context';
import { X, Upload, CheckCircle } from 'lucide-react';
import Link from 'next/link';

export function GlobalProgressIndicator() {
  const { progress, finishImport } = useImportProgress();

  if (!progress.isActive) return null;

  return (
    <div className="fixed top-4 right-4 z-50 glass-card p-4 w-96 border-green-500/30">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <Upload className="text-green-400" size={16} />
          <span className="text-white font-medium text-sm">Import Progress</span>
        </div>
        <button
          onClick={finishImport}
          className="text-gray-400 hover:text-white"
          title="Dismiss"
        >
          <X size={16} />
        </button>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-300">{progress.current} / {progress.total} files</span>
          <span className="text-green-400">{progress.percentage}%</span>
        </div>
        
        <div className="w-full bg-gray-800 rounded-full h-2">
          <div 
            className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress.percentage}%` }}
          />
        </div>
        
        {progress.message && (
          <p className="text-xs text-gray-400 truncate">{progress.message}</p>
        )}
        
        <div className="flex items-center justify-between text-xs">
          <Link 
            href="/"
            className="text-blue-400 hover:text-blue-300 flex items-center space-x-1"
          >
            <span>View Catalog</span>
            <CheckCircle size={12} />
          </Link>
          <Link 
            href="/import"
            className="text-gray-400 hover:text-white"
          >
            Manage Import
          </Link>
        </div>
      </div>
    </div>
  );
}