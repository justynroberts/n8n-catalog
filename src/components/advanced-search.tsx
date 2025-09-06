'use client';

import { useState, useMemo, useEffect } from 'react';
import { WorkflowAnalysis } from '@/types/workflow';
import { 
  Search, 
  Filter, 
  X,
  Settings,
  Globe,
  Database,
  Zap,
  Network,
  Tag
} from 'lucide-react';

interface AdvancedSearchProps {
  workflows: WorkflowAnalysis[];
  onFilterChange: (filteredWorkflows: WorkflowAnalysis[]) => void;
  className?: string;
}

interface SearchFilters {
  query: string;
  category: string;
  complexity: string;
  tags: string[];
  importTags: string[];
  nodes: string[];
  integrations: string[];
  triggers: string[];
  minNodes: number;
  maxNodes: number;
}

export function AdvancedSearch({ workflows, onFilterChange, className = '' }: AdvancedSearchProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    category: '',
    complexity: '',
    tags: [],
    importTags: [],
    nodes: [],
    integrations: [],
    triggers: [],
    minNodes: 0,
    maxNodes: 1000
  });

  // Extract unique values for filter options
  const filterOptions = useMemo(() => {
    const categories = Array.from(new Set(workflows.map(w => w.category))).sort();
    const allTags = Array.from(new Set(workflows.flatMap(w => {
      try {
        return Array.isArray(w.tags) ? w.tags : JSON.parse(w.tags || '[]');
      } catch {
        return [];
      }
    }))).sort();
    const allImportTags = Array.from(new Set(workflows.map(w => w.importTags).filter((tag): tag is string => Boolean(tag)))).sort();
    const allNodes = Array.from(new Set(workflows.flatMap(w => {
      try {
        const nodes = Array.isArray(w.nodes) ? w.nodes : JSON.parse(w.nodes || '[]');
        return nodes.map((n: any) => n.type);
      } catch {
        return [];
      }
    }))).sort();
    const allIntegrations = Array.from(new Set(workflows.flatMap(w => {
      try {
        return Array.isArray(w.integrations) ? w.integrations : JSON.parse(w.integrations || '[]');
      } catch {
        return [];
      }
    }))).sort();
    const allTriggers = Array.from(new Set(workflows.flatMap(w => {
      try {
        return Array.isArray(w.triggers) ? w.triggers : JSON.parse(w.triggers || '[]');
      } catch {
        return [];
      }
    }))).sort();
    
    return {
      categories,
      tags: allTags,
      importTags: allImportTags,
      nodes: allNodes,
      integrations: allIntegrations,
      triggers: allTriggers
    };
  }, [workflows]);

  // Apply filters and update results
  const applyFilters = useMemo(() => {
    const filtered = workflows.filter(workflow => {
      // Text search
      if (filters.query) {
        const searchQuery = filters.query.toLowerCase();
        const searchableText = [
          workflow.name,
          workflow.description,
          workflow.category,
          workflow.useCase,
          ...workflow.tags,
          ...workflow.integrations,
          ...workflow.nodes.map(n => n.type),
          ...workflow.triggers,
          ...workflow.actions
        ].join(' ').toLowerCase();
        
        if (!searchableText.includes(searchQuery)) {
          return false;
        }
      }

      // Category filter
      if (filters.category && workflow.category !== filters.category) {
        return false;
      }

      // Complexity filter
      if (filters.complexity && workflow.complexity !== filters.complexity) {
        return false;
      }

      // Tags filter (all selected tags must be present)
      if (filters.tags.length > 0) {
        try {
          const workflowTags = Array.isArray(workflow.tags) ? workflow.tags : JSON.parse(workflow.tags || '[]');
          if (!filters.tags.every(tag => workflowTags.includes(tag))) {
            return false;
          }
        } catch {
          return false;
        }
      }

      // Import tags filter (any selected import tag must match)
      if (filters.importTags.length > 0) {
        if (!filters.importTags.includes(workflow.importTags || '')) {
          return false;
        }
      }

      // Nodes filter (any selected node must be present)
      if (filters.nodes.length > 0) {
        try {
          const workflowNodes = Array.isArray(workflow.nodes) ? workflow.nodes : JSON.parse(workflow.nodes || '[]');
          const nodeTypes = workflowNodes.map((n: any) => n.type);
          if (!filters.nodes.some(node => nodeTypes.includes(node))) {
            return false;
          }
        } catch {
          return false;
        }
      }

      // Integrations filter (any selected integration must be present)
      if (filters.integrations.length > 0) {
        try {
          const workflowIntegrations = Array.isArray(workflow.integrations) ? workflow.integrations : JSON.parse(workflow.integrations || '[]');
          if (!filters.integrations.some(integration => workflowIntegrations.includes(integration))) {
            return false;
          }
        } catch {
          return false;
        }
      }

      // Triggers filter (any selected trigger must be present)
      if (filters.triggers.length > 0) {
        try {
          const workflowTriggers = Array.isArray(workflow.triggers) ? workflow.triggers : JSON.parse(workflow.triggers || '[]');
          if (!filters.triggers.some(trigger => workflowTriggers.includes(trigger))) {
            return false;
          }
        } catch {
          return false;
        }
      }

      // Node count filter (skip if nodeCount is not defined)
      if (workflow.nodeCount !== undefined && workflow.nodeCount !== null) {
        if (workflow.nodeCount < filters.minNodes || workflow.nodeCount > filters.maxNodes) {
          return false;
        }
      }

      return true;
    });

    return filtered;
  }, [workflows, filters]);

  // Update parent component when filters change
  useEffect(() => {
    onFilterChange(applyFilters);
  }, [applyFilters, onFilterChange]);

  const updateFilter = (key: keyof SearchFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const toggleArrayFilter = (key: 'tags' | 'importTags' | 'nodes' | 'integrations' | 'triggers', value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: prev[key].includes(value)
        ? prev[key].filter(item => item !== value)
        : [...prev[key], value]
    }));
  };

  const clearFilters = () => {
    setFilters({
      query: '',
      category: '',
      complexity: '',
      tags: [],
      importTags: [],
      nodes: [],
      integrations: [],
      triggers: [],
      minNodes: 0,
      maxNodes: 100
    });
  };

  const hasActiveFilters = () => {
    return filters.query !== '' ||
           filters.category !== '' ||
           filters.complexity !== '' ||
           filters.tags.length > 0 ||
           filters.importTags.length > 0 ||
           filters.nodes.length > 0 ||
           filters.integrations.length > 0 ||
           filters.triggers.length > 0 ||
           filters.minNodes > 0 ||
           filters.maxNodes < 100;
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Main Search */}
      <div className="glass-card p-4">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
          {/* Search Input */}
          <div className="flex items-center gap-3 flex-1">
            <Search className="text-gray-400 flex-shrink-0" size={20} />
            <input
              type="text"
              placeholder="Search workflows, nodes, integrations..."
              value={filters.query}
              onChange={(e) => updateFilter('query', e.target.value)}
              className="input-uber"
            />
          </div>

          {/* Quick Filters */}
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className={`uber-button-secondary flex items-center space-x-2 ${
                showAdvanced ? 'bg-green-500/20 border-green-500/50' : ''
              }`}
            >
              <Filter size={18} />
              <span>Advanced</span>
            </button>

            {hasActiveFilters() && (
              <button
                onClick={clearFilters}
                className="uber-button-secondary flex items-center space-x-2 text-red-400 border-red-500/50 hover:bg-red-500/10"
              >
                <X size={18} />
                <span>Clear</span>
              </button>
            )}
          </div>
        </div>

        {/* Results Summary */}
        <div className="mt-3 text-sm text-gray-400">
          Showing {applyFilters.length} of {workflows.length} workflows
          {hasActiveFilters() && (
            <span className="ml-2 text-green-400">
              (filtered)
            </span>
          )}
        </div>
      </div>

      {/* Advanced Filters */}
      {showAdvanced && (
        <div className="glass-card p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Advanced Filters</h3>
            <button
              onClick={() => setShowAdvanced(false)}
              className="text-gray-400 hover:text-white"
            >
              <X size={20} />
            </button>
          </div>

          {/* Basic Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Category
              </label>
              <select
                value={filters.category}
                onChange={(e) => updateFilter('category', e.target.value)}
                className="input-uber w-full"
              >
                <option value="">All Categories</option>
                {filterOptions.categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Complexity
              </label>
              <select
                value={filters.complexity}
                onChange={(e) => updateFilter('complexity', e.target.value)}
                className="input-uber w-full"
              >
                <option value="">All Complexities</option>
                <option value="Simple">Simple</option>
                <option value="Medium">Medium</option>
                <option value="Complex">Complex</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Node Count Range
              </label>
              <div className="flex space-x-2">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={filters.minNodes}
                  onChange={(e) => updateFilter('minNodes', parseInt(e.target.value) || 0)}
                  className="input-uber w-full"
                  placeholder="Min"
                />
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={filters.maxNodes}
                  onChange={(e) => updateFilter('maxNodes', parseInt(e.target.value) || 100)}
                  className="input-uber w-full"
                  placeholder="Max"
                />
              </div>
            </div>
          </div>

          {/* Node Types Filter */}
          {filterOptions.nodes.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center">
                <Network className="mr-2" size={16} />
                Node Types ({filters.nodes.length} selected)
              </label>
              <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto bg-gray-800/30 rounded-lg p-3">
                {filterOptions.nodes.map(node => (
                  <button
                    key={node}
                    onClick={() => toggleArrayFilter('nodes', node)}
                    className={`px-3 py-1 rounded-full text-sm transition-colors ${
                      filters.nodes.includes(node)
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {node}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Integrations Filter */}
          {filterOptions.integrations.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center">
                <Globe className="mr-2" size={16} />
                Integrations ({filters.integrations.length} selected)
              </label>
              <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto bg-gray-800/30 rounded-lg p-3">
                {filterOptions.integrations.map(integration => (
                  <button
                    key={integration}
                    onClick={() => toggleArrayFilter('integrations', integration)}
                    className={`px-3 py-1 rounded-full text-sm transition-colors ${
                      filters.integrations.includes(integration)
                        ? 'bg-purple-500 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {integration}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Triggers Filter */}
          {filterOptions.triggers.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center">
                <Zap className="mr-2" size={16} />
                Triggers ({filters.triggers.length} selected)
              </label>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto bg-gray-800/30 rounded-lg p-3">
                {filterOptions.triggers.map(trigger => (
                  <button
                    key={trigger}
                    onClick={() => toggleArrayFilter('triggers', trigger)}
                    className={`px-3 py-1 rounded-full text-sm transition-colors ${
                      filters.triggers.includes(trigger)
                        ? 'bg-yellow-500 text-black'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {trigger}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Tags Filter */}
          {filterOptions.tags.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center">
                <Tag className="mr-2" size={16} />
                Tags ({filters.tags.length} selected)
              </label>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto bg-gray-800/30 rounded-lg p-3">
                {filterOptions.tags.slice(0, 30).map(tag => (
                  <button
                    key={tag}
                    onClick={() => toggleArrayFilter('tags', tag)}
                    className={`px-3 py-1 rounded-full text-sm transition-colors ${
                      filters.tags.includes(tag)
                        ? 'bg-green-500 text-black'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
                {filterOptions.tags.length > 30 && (
                  <span className="text-gray-400 text-sm px-3 py-1">
                    ... and {filterOptions.tags.length - 30} more
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Import Tags Filter */}
          {filterOptions.importTags.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center">
                <Database className="mr-2" size={16} />
                Import Source ({filters.importTags.length} selected)
              </label>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto bg-gray-800/30 rounded-lg p-3">
                {filterOptions.importTags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => toggleArrayFilter('importTags', tag)}
                    className={`px-3 py-1 rounded-full text-sm transition-colors ${
                      filters.importTags.includes(tag)
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}