'use client';

import { useState, useMemo } from 'react';
import { WorkflowAnalysis } from '@/types/workflow';
import { 
  Search, 
  Filter, 
  SortAsc, 
  SortDesc, 
  Grid, 
  List,
  Download,
  Copy,
  Eye,
  ThumbsUp,
  ThumbsDown,
  Network,
  Zap,
  Info,
  Database
} from 'lucide-react';

interface WorkflowTableProps {
  workflows: WorkflowAnalysis[];
  viewMode: 'grid' | 'table';
  onViewModeChange: (mode: 'grid' | 'table') => void;
  onView?: (workflow: WorkflowAnalysis) => void;
  onCopy?: (workflow: WorkflowAnalysis) => void;
  onDownload?: (workflow: WorkflowAnalysis, format: 'n8n' | 'analysis') => void;
  onVote?: (workflow: WorkflowAnalysis, vote: 'up' | 'down' | null) => void;
}

type SortField = 'name' | 'category' | 'rating' | 'nodeCount' | 'integrations' | 'triggers' | 'lastAnalyzed';
type SortDirection = 'asc' | 'desc';

export function WorkflowTable({ 
  workflows, 
  viewMode, 
  onViewModeChange,
  onView,
  onCopy,
  onDownload,
  onVote 
}: WorkflowTableProps) {
  const [sortField, setSortField] = useState<SortField>('rating');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const [descriptionHover, setDescriptionHover] = useState<{ id: string; x: number; y: number } | null>(null);

  const sortedWorkflows = useMemo(() => {
    const sorted = [...workflows];
    
    sorted.sort((a, b) => {
      let aVal: any;
      let bVal: any;

      switch (sortField) {
        case 'rating':
          aVal = (a.upvotes || 0) - (a.downvotes || 0);
          bVal = (b.upvotes || 0) - (b.downvotes || 0);
          break;
        case 'integrations':
          aVal = a.integrations?.length || 0;
          bVal = b.integrations?.length || 0;
          break;
        case 'triggers':
          aVal = a.triggers?.length || 0;
          bVal = b.triggers?.length || 0;
          break;
        case 'lastAnalyzed':
          aVal = new Date(a.lastAnalyzed).getTime();
          bVal = new Date(b.lastAnalyzed).getTime();
          break;
        default:
          aVal = a[sortField];
          bVal = b[sortField];
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [workflows, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? <SortAsc size={14} /> : <SortDesc size={14} />;
  };

  const handleDescriptionHover = (e: React.MouseEvent, workflow: WorkflowAnalysis) => {
    e.stopPropagation();
    // Debounce hover to prevent flickering
    requestAnimationFrame(() => {
      setDescriptionHover({
        id: workflow.id,
        x: e.clientX,
        y: e.clientY
      });
    });
  };

  const handleDescriptionLeave = () => {
    // Small delay to prevent flickering when moving mouse quickly
    setTimeout(() => {
      setDescriptionHover(null);
    }, 50);
  };

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'Simple': return 'text-green-400 bg-green-500/10';
      case 'Medium': return 'text-yellow-400 bg-yellow-500/10';
      case 'Complex': return 'text-red-400 bg-red-500/10';
      default: return 'text-gray-400';
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'Automation': 'bg-blue-500/20 text-blue-300',
      'Data Processing': 'bg-purple-500/20 text-purple-300',
      'Integration': 'bg-green-500/20 text-green-300',
      'Monitoring': 'bg-yellow-500/20 text-yellow-300',
      'Communication': 'bg-cyan-500/20 text-cyan-300',
      'Marketing': 'bg-pink-500/20 text-pink-300',
      'Development': 'bg-indigo-500/20 text-indigo-300',
      'Business Process': 'bg-orange-500/20 text-orange-300',
      'E-commerce': 'bg-emerald-500/20 text-emerald-300',
      'Content Management': 'bg-violet-500/20 text-violet-300'
    };
    return colors[category] || 'bg-gray-500/20 text-gray-300';
  };

  // Calculate total integrations across all workflows
  const totalIntegrations = workflows.reduce((sum, w) => sum + (w.integrations?.length || 0), 0);
  const totalTriggers = workflows.reduce((sum, w) => sum + (w.triggers?.length || 0), 0);
  const totalNodes = workflows.reduce((sum, w) => sum + (w.nodeCount || 0), 0);

  return (
    <div className="space-y-6">
      {/* View Mode Controls with Stats */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="text-white font-medium">
              {workflows.length} workflow{workflows.length !== 1 ? 's' : ''}
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-400">
              <span className="flex items-center gap-1">
                <Network size={14} />
                {totalNodes} nodes
              </span>
              <span className="flex items-center gap-1">
                <Zap size={14} />
                {totalTriggers} triggers
              </span>
              <span className="flex items-center gap-1">
                {totalIntegrations} integrations
              </span>
            </div>
          </div>
          
          <div className="flex bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => onViewModeChange('grid')}
              className={`p-2 rounded transition-colors ${
                viewMode === 'grid' 
                  ? 'bg-green-500 text-black' 
                  : 'text-gray-400 hover:text-white'
              }`}
              title="Grid View"
            >
              <Grid size={18} />
            </button>
            <button
              onClick={() => onViewModeChange('table')}
              className={`p-2 rounded transition-colors ${
                viewMode === 'table' 
                  ? 'bg-green-500 text-black' 
                  : 'text-gray-400 hover:text-white'
              }`}
              title="Table View"
            >
              <List size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Table View */}
      {viewMode === 'table' && (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-900/50 border-b border-gray-700">
                <tr>
                  <th 
                    className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-white transition-colors"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center gap-2">
                      <span>Workflow</span>
                      {getSortIcon('name')}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-white transition-colors"
                    onClick={() => handleSort('rating')}
                  >
                    <div className="flex items-center gap-2">
                      <ThumbsUp size={14} />
                      <span>Rating</span>
                      {getSortIcon('rating')}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-white transition-colors"
                    onClick={() => handleSort('category')}
                  >
                    <div className="flex items-center gap-2">
                      <span>Category</span>
                      {getSortIcon('category')}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-4 text-center text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-white transition-colors"
                    onClick={() => handleSort('nodeCount')}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <Network size={14} />
                      <span>Nodes</span>
                      {getSortIcon('nodeCount')}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-4 text-center text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-white transition-colors"
                    onClick={() => handleSort('triggers')}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <Zap size={14} />
                      <span>Triggers</span>
                      {getSortIcon('triggers')}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-4 text-center text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-white transition-colors"
                    onClick={() => handleSort('integrations')}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <span>Integrations</span>
                      {getSortIcon('integrations')}
                    </div>
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                    <div className="flex items-center justify-center gap-2">
                      <Database size={14} />
                      <span>Source</span>
                    </div>
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50">
                {sortedWorkflows.map((workflow) => {
                  const netRating = (workflow.upvotes || 0) - (workflow.downvotes || 0);
                  
                  return (
                    <tr 
                      key={workflow.id} 
                      className="hover:bg-gray-900/30 transition-colors"
                      onMouseEnter={() => setHoveredRow(workflow.id)}
                      onMouseLeave={() => setHoveredRow(null)}
                    >
                      <td 
                        className="px-6 py-4 cursor-pointer hover:bg-gray-800/30 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          onView?.(workflow);
                        }}
                        onMouseEnter={(e) => handleDescriptionHover(e, workflow)}
                        onMouseLeave={handleDescriptionLeave}
                      >
                        <div>
                          <div className="text-sm font-medium text-white hover:text-blue-400 transition-colors">
                            {workflow.name}
                          </div>
                          <div className={`text-xs px-2 py-0.5 rounded inline-flex mt-1 ${getComplexityColor(workflow.complexity)}`}>
                            {workflow.complexity}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1">
                            <ThumbsUp className="w-4 h-4 text-green-400" />
                            <span className="text-sm text-green-400">{workflow.upvotes || 0}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <ThumbsDown className="w-4 h-4 text-red-400" />
                            <span className="text-sm text-red-400">{workflow.downvotes || 0}</span>
                          </div>
                          <div className="ml-2">
                            <span className={`text-sm font-bold ${
                              netRating > 0 ? 'text-green-400' : 
                              netRating < 0 ? 'text-red-400' : 
                              'text-gray-400'
                            }`}>
                              {netRating > 0 ? '+' : ''}{netRating}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-xs px-3 py-1 rounded-full ${getCategoryColor(workflow.category)}`}>
                          {workflow.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-sm text-white font-medium">
                          {workflow.nodeCount}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-sm text-white font-medium">
                          {workflow.triggers?.length || 0}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-sm text-white font-medium">
                          {workflow.integrations?.length || 0}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {workflow.importTags ? (
                          <span className="inline-flex items-center gap-1 bg-blue-500/20 text-blue-300 px-2 py-1 rounded-full text-xs border border-blue-500/30">
                            <Database size={12} />
                            {workflow.importTags}
                          </span>
                        ) : (
                          <span className="text-gray-500 text-xs">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onView?.(workflow);
                            }}
                            className="p-1.5 rounded hover:bg-gray-800 text-gray-400 hover:text-green-400 transition-all"
                            title="View details"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onCopy?.(workflow);
                            }}
                            className="p-1.5 rounded hover:bg-gray-800 text-gray-400 hover:text-blue-400 transition-all"
                            title="Copy workflow"
                          >
                            <Copy size={16} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDownload?.(workflow, 'n8n');
                            }}
                            className="p-1.5 rounded hover:bg-gray-800 text-gray-400 hover:text-yellow-400 transition-all"
                            title="Download n8n Workflow"
                          >
                            <Download size={16} />
                          </button>
                          
                          {/* Vote buttons */}
                          <div className="flex items-center border-l border-gray-700 pl-2 ml-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onVote?.(workflow, 'up');
                              }}
                              className="p-1.5 rounded hover:bg-gray-800 text-gray-400 hover:text-green-400 transition-all"
                              title="Upvote"
                            >
                              <ThumbsUp size={16} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onVote?.(workflow, 'down');
                              }}
                              className="p-1.5 rounded hover:bg-gray-800 text-gray-400 hover:text-red-400 transition-all"
                              title="Downvote"
                            >
                              <ThumbsDown size={16} />
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          {sortedWorkflows.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-400">No workflows found</div>
            </div>
          )}
        </div>
      )}

      {/* Description Hover Modal */}
      {descriptionHover && (
        <div 
          className="fixed z-50 pointer-events-none"
          style={{
            left: Math.min(descriptionHover.x + 10, window.innerWidth - 400),
            top: Math.min(descriptionHover.y - 50, window.innerHeight - 150),
            maxWidth: '400px'
          }}
        >
          <div className="bg-gray-900/95 backdrop-blur-md border border-gray-600/50 rounded-lg p-4 shadow-2xl shadow-black/50">
            <div className="text-sm text-gray-300 leading-relaxed">
              {workflows.find(w => w.id === descriptionHover.id)?.description}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}