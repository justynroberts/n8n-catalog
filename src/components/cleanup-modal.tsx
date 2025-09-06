'use client';

import { useState, useEffect } from 'react';
import { 
  X, 
  Trash2, 
  Tag, 
  Copy, 
  AlertTriangle,
  Loader2
} from 'lucide-react';

interface Tag {
  tag: string;
  count: number;
}

interface CleanupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataUpdated: () => void;
}

export function CleanupModal({ isOpen, onClose, onDataUpdated }: CleanupModalProps) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [totalWorkflows, setTotalWorkflows] = useState(0);
  const [loading, setLoading] = useState(false);
  const [operation, setOperation] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadCleanupInfo();
    }
  }, [isOpen]);

  const loadCleanupInfo = async () => {
    try {
      const response = await fetch('/api/cleanup');
      const data = await response.json();
      setTags(data.tags);
      setTotalWorkflows(data.totalWorkflows);
    } catch (error) {
      console.error('Failed to load cleanup info:', error);
    }
  };

  const handleDeleteByTag = async (tag: string, count: number) => {
    if (!confirm(`Are you sure you want to delete ${count} workflows with tag "${tag}"? This cannot be undone.`)) {
      return;
    }

    setLoading(true);
    setOperation(`Deleting ${count} workflows with tag "${tag}"`);
    
    try {
      const response = await fetch('/api/cleanup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete-by-tag', tag })
      });

      const result = await response.json();
      
      if (result.success) {
        alert(result.message);
        await loadCleanupInfo();
        onDataUpdated();
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Delete by tag failed:', error);
      alert('Failed to delete workflows by tag');
    } finally {
      setLoading(false);
      setOperation(null);
    }
  };

  const handleDeleteDuplicates = async () => {
    if (!confirm('Are you sure you want to delete all duplicate workflows? This will keep only the first occurrence of each workflow name and cannot be undone.')) {
      return;
    }

    setLoading(true);
    setOperation('Removing duplicate workflows');

    try {
      const response = await fetch('/api/cleanup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete-duplicates' })
      });

      const result = await response.json();
      
      if (result.success) {
        alert(result.message);
        await loadCleanupInfo();
        onDataUpdated();
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Delete duplicates failed:', error);
      alert('Failed to delete duplicate workflows');
    } finally {
      setLoading(false);
      setOperation(null);
    }
  };

  const handleClearAll = async () => {
    if (!confirm('Are you sure you want to delete ALL workflows? This will permanently delete all workflow data and cannot be undone.')) {
      return;
    }

    if (!confirm('This is your final warning! ALL workflow data will be permanently deleted. Type "DELETE ALL" to confirm this is what you want to do.')) {
      return;
    }

    setLoading(true);
    setOperation('Deleting all workflows');

    try {
      const response = await fetch('/api/cleanup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clear-all' })
      });

      const result = await response.json();
      
      if (result.success) {
        alert(result.message);
        await loadCleanupInfo();
        onDataUpdated();
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Clear all failed:', error);
      alert('Failed to clear all workflows');
    } finally {
      setLoading(false);
      setOperation(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-red-400" />
            Data Cleanup & Management
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-300 transition-colors"
            disabled={loading}
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Summary */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-lg font-medium text-white mb-2">Database Summary</h3>
            <p className="text-gray-300">
              Total workflows: <span className="font-mono text-blue-400">{totalWorkflows}</span>
            </p>
          </div>

          {/* Delete by Tag */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-white flex items-center gap-2">
              <Tag className="w-5 h-5 text-green-400" />
              Delete by Import Tag
            </h3>
            
            {tags.length === 0 ? (
              <p className="text-gray-400">No tagged workflows found</p>
            ) : (
              <div className="space-y-2">
                {tags.map((tag) => (
                  <div key={tag.tag} className="flex items-center justify-between bg-gray-800 rounded-lg p-3">
                    <div className="flex items-center gap-3">
                      <span className="bg-blue-500/20 text-blue-300 px-2 py-1 rounded-full text-sm border border-blue-500/30">
                        {tag.tag}
                      </span>
                      <span className="text-gray-300">
                        {tag.count} workflow{tag.count !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDeleteByTag(tag.tag, tag.count)}
                      disabled={loading}
                      className="px-3 py-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded text-sm transition-colors flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" />
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Delete Duplicates */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-white flex items-center gap-2">
              <Copy className="w-5 h-5 text-orange-400" />
              Remove Duplicates
            </h3>
            <p className="text-gray-400 text-sm">
              Remove workflows with identical names, keeping only the first occurrence.
            </p>
            <button
              onClick={handleDeleteDuplicates}
              disabled={loading}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded transition-colors flex items-center gap-2"
            >
              <Copy className="w-4 h-4" />
              Remove Duplicates
            </button>
          </div>

          {/* Clear All */}
          <div className="space-y-4 border-t border-gray-800 pt-6">
            <h3 className="text-lg font-medium text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              Danger Zone
            </h3>
            <p className="text-gray-400 text-sm">
              Permanently delete all workflow data. This action cannot be undone.
            </p>
            <button
              onClick={handleClearAll}
              disabled={loading}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded transition-colors flex items-center gap-2"
            >
              <AlertTriangle className="w-4 h-4" />
              Delete All Workflows
            </button>
          </div>

          {/* Loading Indicator */}
          {loading && (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-60">
              <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 flex items-center gap-3">
                <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                <span className="text-white">{operation || 'Processing...'}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}