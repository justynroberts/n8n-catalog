'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { WorkflowAnalysis } from '@/types/workflow';
import { WorkflowCard } from '@/components/workflow-card';
import { WorkflowTable } from '@/components/workflow-table';
import { WorkflowModal } from '@/components/workflow-modal';
import { AdvancedSearch } from '@/components/advanced-search';
import { CleanupModal } from '@/components/cleanup-modal';
import { DatabaseManager } from '@/components/database-manager';
import { AuthStatus } from '@/components/auth-status';
import { AuthSettings } from '@/components/auth-settings';
import { ImportProgressBar } from '@/components/import-progress-bar';
import { ApiClient } from '@/lib/api-client';
import { useImportProgress } from '@/contexts/import-progress-context';
import { workflowEvents, WORKFLOW_EVENTS } from '@/lib/workflow-events';
import { 
  Database, 
  Settings, 
  Upload as UploadIcon,
  Brain,
  Activity,
  Zap,
  Store,
  Trash2,
  SortAsc,
  SortDesc
} from 'lucide-react';

type ViewMode = 'grid' | 'table';
type SortField = 'name' | 'rating' | 'nodeCount' | 'lastAnalyzed' | 'category';
type SortDirection = 'asc' | 'desc';

export default function CatalogPage() {
  const [workflows, setWorkflows] = useState<WorkflowAnalysis[]>([]);
  const [filteredWorkflows, setFilteredWorkflows] = useState<WorkflowAnalysis[]>([]);
  const [totalWorkflowCount, setTotalWorkflowCount] = useState<number>(0);
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowAnalysis | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [showSettings, setShowSettings] = useState(false);
  const [showCleanup, setShowCleanup] = useState(false);
  const [showDatabaseManager, setShowDatabaseManager] = useState(false);
  const [api] = useState(() => ApiClient.getInstance());
  const [isClient, setIsClient] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [sortField, setSortField] = useState<SortField>('rating');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const { progress } = useImportProgress();

  // Sort workflows based on current sort field and direction
  const sortedWorkflows = useMemo(() => {
    const workflowsToSort = [...filteredWorkflows];
    
    workflowsToSort.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortField) {
        case 'name':
          aValue = a.name?.toLowerCase() || '';
          bValue = b.name?.toLowerCase() || '';
          break;
        case 'rating':
          aValue = a.rating || 0;
          bValue = b.rating || 0;
          break;
        case 'nodeCount':
          aValue = a.nodes?.length || 0;
          bValue = b.nodes?.length || 0;
          break;
        case 'lastAnalyzed':
          aValue = new Date(a.lastAnalyzed || 0).getTime();
          bValue = new Date(b.lastAnalyzed || 0).getTime();
          break;
        case 'category':
          aValue = a.category?.toLowerCase() || '';
          bValue = b.category?.toLowerCase() || '';
          break;
        default:
          return 0;
      }
      
      if (typeof aValue === 'string') {
        const result = aValue.localeCompare(bValue);
        return sortDirection === 'asc' ? result : -result;
      } else {
        const result = aValue - bValue;
        return sortDirection === 'asc' ? result : -result;
      }
    });
    
    return workflowsToSort;
  }, [filteredWorkflows, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const loadWorkflows = async () => {
    try {
      setIsLoading(true);
      const result = await api.getAllWorkflows();
      console.log('Loaded workflows:', result.workflows?.length || 0, 'out of', result.total, 'total');
      setWorkflows(result.workflows);
      setFilteredWorkflows(result.workflows);
      setTotalWorkflowCount(result.total);
    } catch (error) {
      console.error('Failed to load workflows:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const checkAuthStatus = async () => {
    try {
      const token = localStorage.getItem('auth-token');
      if (!token) {
        setIsAuthenticated(false);
        return;
      }
      
      const response = await fetch('/api/auth/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });
      const data = await response.json();
      setIsAuthenticated(data.authenticated);
    } catch (error) {
      setIsAuthenticated(false);
    }
  };

  useEffect(() => {
    setIsClient(true);
    
    // Check authentication status
    checkAuthStatus();
    
    // Load workflows on mount
    loadWorkflows();
    
    // Subscribe to workflow events for real-time updates
    const unsubscribeWorkflowAdded = workflowEvents.on(
      WORKFLOW_EVENTS.WORKFLOW_ADDED,
      (data: { workflow: WorkflowAnalysis }) => {
        // Update both workflows and filtered workflows to keep them in sync
        setWorkflows(prev => {
          const exists = prev.some(w => w.id === data.workflow.id);
          if (exists) {
            return prev.map(w => w.id === data.workflow.id ? data.workflow : w);
          } else {
            return [data.workflow, ...prev];
          }
        });
        
        setFilteredWorkflows(prev => {
          const exists = prev.some(w => w.id === data.workflow.id);
          if (exists) {
            return prev.map(w => w.id === data.workflow.id ? data.workflow : w);
          } else {
            return [data.workflow, ...prev];
          }
        });
      }
    );
    
    return () => {
      unsubscribeWorkflowAdded();
    };
  }, []); // api is stable singleton, no dependencies needed


  const handleClearData = async () => {
    if (confirm('Are you sure you want to clear all workflow data? This cannot be undone.')) {
      try {
        await api.clearAllWorkflows();
        setWorkflows([]);
        setFilteredWorkflows([]);
      } catch (error) {
        console.error('Failed to clear data:', error);
      }
    }
  };


  const handleDataUpdated = async () => {
    await loadWorkflows();
  };

  const handleWorkflowView = (workflow: WorkflowAnalysis) => {
    setSelectedWorkflow(workflow);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedWorkflow(null);
  };

  const handleFilterChange = (filtered: WorkflowAnalysis[]) => {
    setFilteredWorkflows(filtered);
  };

  const handleWorkflowCopy = (workflow: WorkflowAnalysis) => {
    navigator.clipboard.writeText(JSON.stringify(workflow, null, 2));
    // TODO: Add success message state if needed
  };

  const handleWorkflowDownload = async (workflow: WorkflowAnalysis, format: 'n8n' | 'analysis' = 'n8n') => {
    try {
      let data: any;
      let filename: string;
      
      if (format === 'n8n' && workflow.workflowData) {
        // Download original n8n workflow
        data = workflow.workflowData;
        filename = `${workflow.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_n8n.json`;
      } else if (format === 'n8n') {
        // Try to fetch original workflow data from API
        const response = await fetch(`/api/workflows?id=${workflow.id}&format=n8n`);
        if (response.ok) {
          data = await response.json();
          filename = `${workflow.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_n8n.json`;
        } else {
          // Fallback to analysis data
          data = workflow;
          filename = `${workflow.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_analysis.json`;
          console.warn('Original workflow data not available, downloading analysis data instead');
        }
      } else {
        // Download analysis data
        data = workflow;
        filename = `${workflow.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_analysis.json`;
      }
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download workflow:', error);
    }
  };

  const handleWorkflowVote = async (workflow: WorkflowAnalysis, vote: 'up' | 'down' | null) => {
    try {
      // Update the local state optimistically
      setWorkflows(prev => prev.map(w => {
        if (w.id === workflow.id) {
          const currentUpvotes = w.upvotes || 0;
          const currentDownvotes = w.downvotes || 0;
          const currentUserVote = w.userVote;

          let newUpvotes = currentUpvotes;
          let newDownvotes = currentDownvotes;

          // Remove previous vote if any
          if (currentUserVote === 'up') {
            newUpvotes--;
          } else if (currentUserVote === 'down') {
            newDownvotes--;
          }

          // Add new vote if not null
          if (vote === 'up') {
            newUpvotes++;
          } else if (vote === 'down') {
            newDownvotes++;
          }

          return {
            ...w,
            upvotes: newUpvotes,
            downvotes: newDownvotes,
            userVote: vote
          };
        }
        return w;
      }));

      // Also update filtered workflows
      setFilteredWorkflows(prev => prev.map(w => {
        if (w.id === workflow.id) {
          const currentUpvotes = w.upvotes || 0;
          const currentDownvotes = w.downvotes || 0;
          const currentUserVote = w.userVote;

          let newUpvotes = currentUpvotes;
          let newDownvotes = currentDownvotes;

          // Remove previous vote if any
          if (currentUserVote === 'up') {
            newUpvotes--;
          } else if (currentUserVote === 'down') {
            newDownvotes--;
          }

          // Add new vote if not null
          if (vote === 'up') {
            newUpvotes++;
          } else if (vote === 'down') {
            newDownvotes++;
          }

          return {
            ...w,
            upvotes: newUpvotes,
            downvotes: newDownvotes,
            userVote: vote
          };
        }
        return w;
      }));

      // TODO: Persist vote to database/API
      // await api.voteWorkflow(workflow.id, vote);

    } catch (error) {
      console.error('Failed to vote on workflow:', error);
      // TODO: Revert optimistic update on error
    }
  };

  const stats = {
    totalWorkflows: totalWorkflowCount,
    categories: workflows.reduce((acc, w) => {
      acc[w.category] = (acc[w.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    complexities: workflows.reduce((acc, w) => {
      acc[w.complexity] = (acc[w.complexity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    integrations: workflows.reduce((acc, w) => {
      w.integrations?.forEach(integration => {
        acc[integration] = (acc[integration] || 0) + 1;
      });
      return acc;
    }, {} as Record<string, number>),
    lastUpdated: '',
    storageSize: 0
  };

  return (
    <React.Fragment>
      <ImportProgressBar />
      <div className="min-h-screen p-4">
        <div className="max-w-[1600px] mx-auto space-y-6">
        {/* Header */}
        <header className="glass-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
                  <Store className="w-7 h-7 text-white" />
                </div>
                <h1 className="text-3xl font-bold text-white">
                  The Workflow Bazaar
                </h1>
              </div>
              <p className="text-gray-400 ml-15">
                Discover, rate, and share thousands of n8n workflow automations
              </p>
            </div>
            
            <div className="flex items-center space-x-3">
              <AuthStatus onModalStateChange={setIsAdminModalOpen} />
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-uber-gray-900 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <Database className="text-uber-green" size={20} />
                <div>
                  <div className="text-white font-semibold">{stats.totalWorkflows}</div>
                  <div className="text-uber-gray-400 text-sm">Workflows</div>
                </div>
              </div>
            </div>
            
            <div className="bg-uber-gray-900 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <Activity className="text-uber-blue" size={20} />
                <div>
                  <div className="text-white font-semibold">{Object.keys(stats.categories).length}</div>
                  <div className="text-uber-gray-400 text-sm">Categories</div>
                </div>
              </div>
            </div>
            
            <div className="bg-uber-gray-900 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <Zap className="text-uber-yellow" size={20} />
                <div>
                  <div className="text-white font-semibold">{Object.keys(stats.integrations).length}</div>
                  <div className="text-uber-gray-400 text-sm">Integrations</div>
                </div>
              </div>
            </div>
            
            <div className="bg-uber-gray-900 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <div>
                  <div className="text-white font-semibold">
                    {Math.round((stats.storageSize / 1024) * 10) / 10}KB
                  </div>
                  <div className="text-uber-gray-400 text-sm">Cache Size</div>
                </div>
                <Brain className="text-uber-purple" size={20} />
              </div>
            </div>
          </div>
        </header>

        {/* Settings Panel */}
        <AuthSettings 
          showSettings={showSettings} 
          setShowSettings={setShowSettings}
          onAuthChange={checkAuthStatus}
        />
        
        {/* Old Settings Panel - Remove this block */}
        {false && showSettings && (
          <div className="glass-card p-6 border-red-500/20">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">Settings</h2>
              <button
                onClick={() => setShowSettings(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-6">
              {/* Danger Zone */}
              <div className="border border-red-500/30 rounded-lg p-4 bg-red-500/5">
                <h3 className="text-lg font-medium text-red-400 mb-3 flex items-center space-x-2">
                  <span>⚠️</span>
                  <span>Danger Zone</span>
                </h3>
                
                <div className="space-y-3">
                  <p className="text-gray-300 text-sm">
                    This action will permanently delete all workflow data from your catalog. This includes:
                  </p>
                  <ul className="text-gray-400 text-sm space-y-1 ml-4">
                    <li>• All imported workflows and their metadata</li>
                    <li>• Analysis data and categories</li>
                    <li>• Voting history and ratings</li>
                    <li>• Import sessions and history</li>
                  </ul>
                  
                  <div className="flex items-center space-x-3 pt-3">
                    <button
                      onClick={() => setShowCleanup(true)}
                      className="flex items-center space-x-2 px-4 py-2 bg-red-600/80 hover:bg-red-500 text-white text-sm rounded-lg transition-colors border border-red-500/50"
                    >
                      <Trash2 size={16} />
                      <span>Data Cleanup & Management</span>
                    </button>
                    
                    <div className="text-gray-500 text-xs">
                      Current catalog: {workflows.length} workflow{workflows.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Database Management */}
              <div className="border border-blue-500/30 rounded-lg p-4 bg-blue-500/5">
                <h3 className="text-lg font-medium text-blue-400 mb-3 flex items-center space-x-2">
                  <Database size={20} />
                  <span>Database Management</span>
                </h3>
                
                <div className="space-y-3">
                  <p className="text-gray-300 text-sm">
                    Export your entire catalog for backup or import data from another instance.
                  </p>
                  
                  <button
                    onClick={() => setShowDatabaseManager(true)}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600/80 hover:bg-blue-500 text-white text-sm rounded-lg transition-colors border border-blue-500/50"
                  >
                    <Database size={16} />
                    <span>Manage Database</span>
                  </button>
                </div>
              </div>

              {/* General Settings */}
              <div className="border border-gray-700/50 rounded-lg p-4">
                <h3 className="text-lg font-medium text-white mb-3">General</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300 text-sm">View Mode</span>
                    <span className="text-gray-400 text-sm capitalize">{viewMode}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300 text-sm">Total Workflows</span>
                    <span className="text-gray-400 text-sm">{workflows.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300 text-sm">Filtered Results</span>
                    <span className="text-gray-400 text-sm">{filteredWorkflows.length}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}


        {/* Loading Spinner */}
        {isLoading && (
          <div className="glass-card p-16 text-center">
            <div className="flex flex-col items-center space-y-4">
              <div className="relative">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-500"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Database className="text-purple-400" size={24} />
                </div>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">
                  Loading Workflow Catalog
                </h3>
                <p className="text-gray-400 text-sm">
                  Fetching your workflows from the database...
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Search and Filters */}
        {!isLoading && workflows.length > 0 && (
          <AdvancedSearch
            workflows={workflows}
            onFilterChange={handleFilterChange}
          />
        )}

        {/* Workflows Display */}
        {!isLoading && workflows.length > 0 && (
          <>
            <WorkflowTable
              workflows={filteredWorkflows}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              onView={handleWorkflowView}
              onCopy={handleWorkflowCopy}
              onDownload={handleWorkflowDownload}
              onVote={handleWorkflowVote}
            />

            {viewMode === 'grid' && (
              <>
                {/* Sorting Controls for Grid View */}
                <div className="flex items-center gap-4 mb-6 p-4 glass-card">
                  <span className="text-sm font-medium text-gray-300">Sort by:</span>
                  
                  <button
                    onClick={() => handleSort('name')}
                    className={`flex items-center gap-1 px-3 py-1 rounded text-sm transition-colors ${
                      sortField === 'name' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    Name
                    {sortField === 'name' && (
                      sortDirection === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />
                    )}
                  </button>
                  
                  <button
                    onClick={() => handleSort('rating')}
                    className={`flex items-center gap-1 px-3 py-1 rounded text-sm transition-colors ${
                      sortField === 'rating' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    Rating
                    {sortField === 'rating' && (
                      sortDirection === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />
                    )}
                  </button>
                  
                  <button
                    onClick={() => handleSort('nodeCount')}
                    className={`flex items-center gap-1 px-3 py-1 rounded text-sm transition-colors ${
                      sortField === 'nodeCount' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    Nodes
                    {sortField === 'nodeCount' && (
                      sortDirection === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />
                    )}
                  </button>
                  
                  <button
                    onClick={() => handleSort('lastAnalyzed')}
                    className={`flex items-center gap-1 px-3 py-1 rounded text-sm transition-colors ${
                      sortField === 'lastAnalyzed' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    Date
                    {sortField === 'lastAnalyzed' && (
                      sortDirection === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />
                    )}
                  </button>
                  
                  <button
                    onClick={() => handleSort('category')}
                    className={`flex items-center gap-1 px-3 py-1 rounded text-sm transition-colors ${
                      sortField === 'category' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    Category
                    {sortField === 'category' && (
                      sortDirection === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />
                    )}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                  {sortedWorkflows.map((workflow) => (
                    <WorkflowCard
                      key={workflow.id}
                      workflow={workflow}
                      onView={handleWorkflowView}
                      onCopy={handleWorkflowCopy}
                      onDownload={handleWorkflowDownload}
                      onVote={handleWorkflowVote}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {!isLoading && workflows.length === 0 && (
          <div className="glass-card p-12 text-center">
            <Database className="mx-auto text-gray-600 mb-4" size={48} />
            <h3 className="text-xl font-semibold text-white mb-2">
              No workflows in catalog
            </h3>
            <p className="text-gray-400 mb-6">
              {isAuthenticated 
                ? "Import your n8n workflow JSON files using the Admin Settings to get started with AI-powered analysis"
                : "Please log in to access admin tools and import n8n workflows"
              }
            </p>
          </div>
        )}

        {/* Workflow Modal */}
        <WorkflowModal
          workflow={selectedWorkflow}
          isOpen={showModal}
          onClose={handleCloseModal}
          onCopy={handleWorkflowCopy}
          onDownload={handleWorkflowDownload}
        />

        {/* Cleanup Modal */}
        <CleanupModal
          isOpen={showCleanup}
          onClose={() => setShowCleanup(false)}
          onDataUpdated={handleDataUpdated}
        />

        {/* Database Manager Modal */}
        {showDatabaseManager && (
          <DatabaseManager
            onClose={() => setShowDatabaseManager(false)}
          />
        )}
      </div>
      </div>
    </React.Fragment>
  );
}