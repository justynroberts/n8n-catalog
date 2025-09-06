import { useState, useEffect, useCallback, useMemo } from 'react';
import { WorkflowAnalysis } from '@/types/workflow';
import { EnhancedApiClient } from '@/lib/enhanced-api-client';

interface UseWorkflowsOptions {
  autoLoad?: boolean;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  searchQuery?: string;
  enableIncrementalLoading?: boolean;
}

interface WorkflowsState {
  workflows: WorkflowAnalysis[];
  loading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  } | null;
  cacheStats: {
    memorySize: number;
    maxMemorySize: number;
    memoryTTL: number;
    persistentTTL: number;
  };
}

export function useWorkflows(options: UseWorkflowsOptions = {}) {
  const {
    autoLoad = true,
    pageSize = 50,
    sortBy = 'rating',
    sortOrder = 'desc',
    searchQuery,
    enableIncrementalLoading = false
  } = options;

  const [state, setState] = useState<WorkflowsState>({
    workflows: [],
    loading: false,
    error: null,
    pagination: null,
    cacheStats: {
      memorySize: 0,
      maxMemorySize: 100,
      memoryTTL: 5 * 60 * 1000,
      persistentTTL: 30 * 60 * 1000
    }
  });

  const [currentPage, setCurrentPage] = useState(1);
  const apiClient = useMemo(() => EnhancedApiClient.getInstance(), []);

  // Update cache stats
  const updateCacheStats = useCallback(() => {
    const stats = apiClient.getCacheStats();
    setState(prev => ({ ...prev, cacheStats: stats }));
  }, [apiClient]);

  // Load workflows
  const loadWorkflows = useCallback(async (
    page: number = 1,
    append: boolean = false
  ) => {
    if (state.loading) return;

    setState(prev => ({ 
      ...prev, 
      loading: true, 
      error: null 
    }));

    try {
      let result;
      
      if (searchQuery) {
        result = await apiClient.searchWorkflows(searchQuery, {
          page,
          limit: pageSize,
          sortBy,
          sortOrder
        });
      } else {
        result = await apiClient.getAllWorkflows({
          page,
          limit: pageSize,
          sortBy,
          sortOrder
        });
      }

      setState(prev => ({
        ...prev,
        workflows: append 
          ? [...prev.workflows, ...result.workflows] 
          : result.workflows,
        pagination: result.pagination,
        loading: false,
        error: null
      }));

      updateCacheStats();
      
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load workflows'
      }));
    }
  }, [apiClient, pageSize, sortBy, sortOrder, searchQuery, state.loading, updateCacheStats]);

  // Load workflows incrementally
  const loadWorkflowsIncremental = useCallback(async (
    onProgress?: (progress: { loaded: number; total: number }) => void
  ) => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const allWorkflows = await apiClient.loadWorkflowsIncremental(
        (batch, progress) => {
          setState(prev => ({
            ...prev,
            workflows: [...prev.workflows, ...batch]
          }));
          
          onProgress?.(progress);
        },
        pageSize
      );

      setState(prev => ({
        ...prev,
        workflows: allWorkflows,
        loading: false,
        pagination: {
          page: 1,
          limit: allWorkflows.length,
          total: allWorkflows.length,
          totalPages: 1,
          hasMore: false
        }
      }));

      updateCacheStats();
      
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load workflows'
      }));
    }
  }, [apiClient, pageSize, updateCacheStats]);

  // Load next page
  const loadNextPage = useCallback(() => {
    if (state.pagination?.hasMore && !state.loading) {
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      loadWorkflows(nextPage, true);
    }
  }, [state.pagination?.hasMore, state.loading, currentPage, loadWorkflows]);

  // Refresh workflows
  const refresh = useCallback(() => {
    setCurrentPage(1);
    setState(prev => ({ ...prev, workflows: [] }));
    loadWorkflows(1, false);
  }, [loadWorkflows]);

  // Get workflow by ID
  const getWorkflowById = useCallback(async (id: string) => {
    try {
      return await apiClient.getWorkflowById(id);
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to get workflow');
    }
  }, [apiClient]);

  // Cache management
  const clearCache = useCallback(async () => {
    await apiClient.clearCache();
    updateCacheStats();
    refresh();
  }, [apiClient, updateCacheStats, refresh]);

  // Search workflows
  const searchWorkflows = useCallback(async (query: string) => {
    setState(prev => ({ ...prev, workflows: [], loading: true, error: null }));
    setCurrentPage(1);
    
    try {
      const result = await apiClient.searchWorkflows(query, {
        page: 1,
        limit: pageSize,
        sortBy,
        sortOrder
      });

      setState(prev => ({
        ...prev,
        workflows: result.workflows,
        pagination: result.pagination,
        loading: false
      }));

      updateCacheStats();
      
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Search failed'
      }));
    }
  }, [apiClient, pageSize, sortBy, sortOrder, updateCacheStats]);

  // Prefetch related workflows
  const prefetchRelated = useCallback(async (workflow: WorkflowAnalysis) => {
    await apiClient.prefetchRelatedWorkflows(workflow);
    updateCacheStats();
  }, [apiClient, updateCacheStats]);

  // Auto-load workflows on mount or when dependencies change
  useEffect(() => {
    if (autoLoad) {
      if (enableIncrementalLoading) {
        loadWorkflowsIncremental();
      } else {
        loadWorkflows(1, false);
      }
    }
  }, [autoLoad, searchQuery, sortBy, sortOrder, enableIncrementalLoading]);

  // Update cache stats periodically
  useEffect(() => {
    const interval = setInterval(updateCacheStats, 10000); // Every 10 seconds
    return () => clearInterval(interval);
  }, [updateCacheStats]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      apiClient.destroy();
    };
  }, [apiClient]);

  return {
    // State
    workflows: state.workflows,
    loading: state.loading,
    error: state.error,
    pagination: state.pagination,
    cacheStats: state.cacheStats,
    
    // Actions
    loadWorkflows,
    loadWorkflowsIncremental,
    loadNextPage,
    refresh,
    getWorkflowById,
    searchWorkflows,
    prefetchRelated,
    clearCache,
    
    // Computed
    hasMore: state.pagination?.hasMore || false,
    total: state.pagination?.total || 0,
    currentPage,
    
    // Cache efficiency metrics
    cacheHitRate: state.cacheStats.memorySize > 0 ? 
      (state.cacheStats.memorySize / state.cacheStats.maxMemorySize) : 0,
  };
}