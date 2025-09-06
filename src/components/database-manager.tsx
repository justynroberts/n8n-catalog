'use client';

import React, { useState, useRef } from 'react';
import { Download, Upload, Database, Info, FileText, AlertTriangle, CheckCircle, X } from 'lucide-react';

interface DatabaseStats {
  totalWorkflows: number;
  totalSessions: number;
  totalQueueItems: number;
  dbSize: string;
  uniqueTags: number;
  categories: string[];
}

interface ImportResult {
  imported: number;
  skipped: number;
  errors: string[];
}

interface DatabaseManagerProps {
  onClose: () => void;
}

export function DatabaseManager({ onClose }: DatabaseManagerProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [stats, setStats] = useState<DatabaseStats | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importOptions, setImportOptions] = useState({
    clearExisting: false,
    skipDuplicates: true,
    preserveIds: false
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadStats = async () => {
    setIsLoadingStats(true);
    try {
      const response = await fetch('/api/database?action=stats');
      const result = await response.json();
      
      if (result.success) {
        setStats(result.data);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Failed to load database stats:', error);
    } finally {
      setIsLoadingStats(false);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const response = await fetch('/api/database?action=export');
      
      if (!response.ok) {
        const errorData = await response.text();
        console.error('Export error response:', errorData);
        throw new Error(`Export failed: ${response.status} ${response.statusText}`);
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = response.headers.get('Content-Disposition')?.split('filename=')[1]?.replace(/"/g, '') || 'n8n-catalog-export.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      // Show success feedback
      alert('Database exported successfully!');
      
      // Reload stats after export
      await loadStats();
    } catch (error) {
      console.error('Export failed:', error);
      alert(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    if (!file.name.endsWith('.json')) {
      alert('Please select a JSON file');
      return;
    }
    
    setIsImporting(true);
    setImportResult(null);
    
    try {
      const text = await file.text();
      
      const response = await fetch('/api/database', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'import',
          data: text,
          options: importOptions
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        setImportResult(result.data);
        // Reload stats after import
        await loadStats();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Import failed:', error);
      alert(`Import failed: ${error}`);
    } finally {
      setIsImporting(false);
      // Clear file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  // Load stats on component mount
  React.useEffect(() => {
    loadStats();
  }, []);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="glass-card max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Database className="text-blue-400" size={24} />
              <h2 className="text-xl font-semibold text-white">Database Manager</h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white"
            >
              <X size={20} />
            </button>
          </div>

          {/* Database Statistics */}
          {isLoadingStats ? (
            <div className="flex items-center justify-center py-8">
              <div className="flex flex-col items-center space-y-3">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
                <span className="text-gray-400 text-sm">Loading database statistics...</span>
              </div>
            </div>
          ) : stats ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-gray-800/50 p-4 rounded-lg">
                <div className="text-sm text-gray-400">Workflows</div>
                <div className="text-2xl font-bold text-white">{stats.totalWorkflows}</div>
              </div>
              <div className="bg-gray-800/50 p-4 rounded-lg">
                <div className="text-sm text-gray-400">Categories</div>
                <div className="text-2xl font-bold text-white">{stats.categories.length}</div>
              </div>
              <div className="bg-gray-800/50 p-4 rounded-lg">
                <div className="text-sm text-gray-400">Import Tags</div>
                <div className="text-2xl font-bold text-white">{stats.uniqueTags}</div>
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-400 py-4">
              Failed to load database statistics
            </div>
          )}

          {/* Export Section */}
          <div className="space-y-3">
            <h3 className="text-lg font-medium text-white flex items-center">
              <Download className="mr-2" size={20} />
              Export Database
            </h3>
            <p className="text-gray-400 text-sm">
              Export all workflows, sessions, and metadata to a JSON file for backup or migration.
            </p>
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="uber-button flex items-center space-x-2"
            >
              {isExporting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black" />
                  <span>Exporting...</span>
                </>
              ) : (
                <>
                  <Download size={18} />
                  <span>Download Database Export</span>
                </>
              )}
            </button>
          </div>

          {/* Import Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-white flex items-center">
              <Upload className="mr-2" size={20} />
              Import Database
            </h3>
            <p className="text-gray-400 text-sm">
              Import workflows from a previously exported JSON file.
            </p>

            {/* Import Options */}
            <div className="space-y-3 bg-gray-800/30 p-4 rounded-lg">
              <h4 className="text-white font-medium flex items-center">
                <Info size={16} className="mr-2" />
                Import Options
              </h4>
              
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={importOptions.clearExisting}
                  onChange={(e) => setImportOptions(prev => ({ ...prev, clearExisting: e.target.checked }))}
                  className="rounded"
                />
                <div>
                  <span className="text-white">Clear existing data</span>
                  <div className="text-xs text-gray-400">⚠️ This will delete all current workflows before importing</div>
                </div>
              </label>

              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={importOptions.skipDuplicates}
                  onChange={(e) => setImportOptions(prev => ({ ...prev, skipDuplicates: e.target.checked }))}
                  className="rounded"
                />
                <div>
                  <span className="text-white">Skip duplicate workflows</span>
                  <div className="text-xs text-gray-400">Skip workflows with names that already exist</div>
                </div>
              </label>

              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={importOptions.preserveIds}
                  onChange={(e) => setImportOptions(prev => ({ ...prev, preserveIds: e.target.checked }))}
                  className="rounded"
                />
                <div>
                  <span className="text-white">Preserve original IDs</span>
                  <div className="text-xs text-gray-400">Keep original workflow and session IDs (may cause conflicts)</div>
                </div>
              </label>
            </div>

            {/* Import Button */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImportFile}
              className="hidden"
            />
            
            <button
              onClick={handleImportClick}
              disabled={isImporting}
              className="uber-button-secondary flex items-center space-x-2"
            >
              {isImporting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  <span>Importing...</span>
                </>
              ) : (
                <>
                  <FileText size={18} />
                  <span>Select JSON File to Import</span>
                </>
              )}
            </button>
          </div>

          {/* Import Results */}
          {importResult && (
            <div className="space-y-3">
              <h4 className="text-white font-medium flex items-center">
                <CheckCircle className="mr-2 text-green-400" size={20} />
                Import Results
              </h4>
              
              <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-green-300">Imported:</span>
                  <span className="text-white font-medium">{importResult.imported}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-yellow-300">Skipped:</span>
                  <span className="text-white font-medium">{importResult.skipped}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-red-300">Errors:</span>
                  <span className="text-white font-medium">{importResult.errors.length}</span>
                </div>
              </div>

              {importResult.errors.length > 0 && (
                <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
                  <h5 className="text-red-300 font-medium flex items-center mb-2">
                    <AlertTriangle size={16} className="mr-2" />
                    Errors
                  </h5>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {importResult.errors.map((error, index) => (
                      <div key={index} className="text-xs text-red-200 bg-red-900/30 p-2 rounded">
                        {error}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Warning */}
          <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="text-yellow-400 flex-shrink-0 mt-0.5" size={20} />
              <div>
                <h4 className="text-yellow-300 font-medium">Important Notes</h4>
                <ul className="text-sm text-yellow-200 mt-2 space-y-1">
                  <li>• Always backup your current database before importing</li>
                  <li>• Large imports may take several minutes to complete</li>
                  <li>• Import files must be in the correct JSON format</li>
                  <li>• "Clear existing data" will permanently delete all current workflows</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}