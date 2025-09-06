'use client';

import { WorkflowAnalysis } from '@/types/workflow';
import { WorkflowDiagramReactFlow } from '@/components/workflow-diagram-react-flow';
import { 
  X, 
  Network, 
  Clock, 
  Tag, 
  Zap, 
  Settings, 
  FileText,
  Copy,
  Download,
  ExternalLink,
  Database,
  GitBranch,
  Activity,
  Calendar,
  Info,
  Code,
  Globe,
  AlertCircle,
  Workflow
} from 'lucide-react';
import { useState } from 'react';

interface WorkflowModalProps {
  workflow: WorkflowAnalysis | null;
  isOpen: boolean;
  onClose: () => void;
  onCopy?: (workflow: WorkflowAnalysis) => void;
  onDownload?: (workflow: WorkflowAnalysis, format: 'n8n' | 'analysis') => void;
}

export function WorkflowModal({ workflow, isOpen, onClose, onCopy, onDownload }: WorkflowModalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'logic' | 'nodes' | 'dependencies' | 'diagram' | 'raw'>('overview');

  if (!isOpen || !workflow) return null;

  const handleCopy = () => {
    onCopy?.(workflow);
  };

  const handleDownload = (format: 'n8n' | 'analysis' = 'n8n') => {
    onDownload?.(workflow, format);
  };

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'Simple': return 'text-green-400';
      case 'Medium': return 'text-yellow-400';
      case 'Complex': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'Automation': 'bg-green-500/20 text-green-400 border-green-500/30',
      'Data Processing': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      'Integration': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      'Monitoring': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      'Communication': 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
      'Marketing': 'bg-pink-500/20 text-pink-400 border-pink-500/30',
      'Development': 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
      'Business Process': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      'E-commerce': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      'Content Management': 'bg-violet-500/20 text-violet-400 border-violet-500/30'
    };
    return colors[category] || 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="glass-card w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold text-white truncate">
              {workflow.name}
            </h2>
            <p className="text-gray-400 mt-1">
              {workflow.description}
            </p>
          </div>
          
          <div className="flex items-center space-x-3 ml-4">
            <button
              onClick={handleCopy}
              className="uber-button-secondary p-3"
              title="Copy workflow"
            >
              <Copy size={18} />
            </button>
            <button
              onClick={() => handleDownload('n8n')}
              className="uber-button-secondary p-3"
              title="Download n8n workflow"
            >
              <Download size={18} />
            </button>
            <button
              onClick={onClose}
              className="uber-button-secondary p-3 hover:bg-red-500/20 hover:border-red-500/50"
              title="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-700">
          {[
            { id: 'overview', label: 'Overview', icon: Info },
            { id: 'logic', label: 'Logic & Flow', icon: GitBranch },
            { id: 'nodes', label: 'Nodes', icon: Network },
            { id: 'dependencies', label: 'Dependencies', icon: Database },
            { id: 'diagram', label: 'Visual Diagram', icon: Workflow },
            { id: 'raw', label: 'Raw Data', icon: Code }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`flex items-center space-x-2 px-6 py-4 border-b-2 transition-colors ${
                activeTab === id 
                  ? 'border-green-500 text-white bg-green-500/10' 
                  : 'border-transparent text-gray-400 hover:text-white hover:bg-gray-800/50'
              }`}
            >
              <Icon size={18} />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Key Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-800/50 rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <Network className="text-blue-400" size={20} />
                    <div>
                      <div className="text-white font-semibold">{workflow.nodeCount}</div>
                      <div className="text-gray-400 text-sm">Nodes</div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-800/50 rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <Zap className="text-yellow-400" size={20} />
                    <div>
                      <div className="text-white font-semibold">{workflow.triggers.length}</div>
                      <div className="text-gray-400 text-sm">Triggers</div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-800/50 rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <Clock className="text-cyan-400" size={20} />
                    <div>
                      <div className="text-white font-semibold">{workflow.estimatedRuntime}</div>
                      <div className="text-gray-400 text-sm">Runtime</div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-800/50 rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <Settings className={getComplexityColor(workflow.complexity)} size={20} />
                    <div>
                      <div className={`font-semibold ${getComplexityColor(workflow.complexity)}`}>
                        {workflow.complexity}
                      </div>
                      <div className="text-gray-400 text-sm">Complexity</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Input/Output Requirements */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-gray-800/30 rounded-lg p-4">
                  <h3 className="text-white font-semibold mb-3 flex items-center">
                    <Activity className="mr-2 text-green-400" size={18} />
                    Input Requirements
                  </h3>
                  <div className="space-y-2">
                    {workflow.inputRequirements && workflow.inputRequirements.length > 0 ? 
                      workflow.inputRequirements.map((input, index) => (
                        <div key={index} className="bg-green-500/10 border border-green-500/30 rounded-lg p-2">
                          <span className="text-green-300 text-sm">{input}</span>
                        </div>
                      )) : (
                        <span className="text-gray-500">No specific input requirements</span>
                      )}
                  </div>
                </div>
                
                <div className="bg-gray-800/30 rounded-lg p-4">
                  <h3 className="text-white font-semibold mb-3 flex items-center">
                    <ExternalLink className="mr-2 text-blue-400" size={18} />
                    Expected Outputs
                  </h3>
                  <div className="space-y-2">
                    {workflow.expectedOutputs && workflow.expectedOutputs.length > 0 ? 
                      workflow.expectedOutputs.map((output, index) => (
                        <div key={index} className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-2">
                          <span className="text-blue-300 text-sm">{output}</span>
                        </div>
                      )) : (
                        <span className="text-gray-500">No specific output defined</span>
                      )}
                  </div>
                </div>
              </div>

              {/* Data Flow */}
              {workflow.dataFlow && (
                <div className="bg-gray-800/30 rounded-lg p-4">
                  <h3 className="text-white font-semibold mb-3 flex items-center">
                    <GitBranch className="mr-2 text-purple-400" size={18} />
                    Data Flow
                  </h3>
                  <p className="text-gray-300 leading-relaxed">
                    {workflow.dataFlow}
                  </p>
                </div>
              )}

              {/* Business Logic */}
              {workflow.businessLogic && (
                <div className="bg-gray-800/30 rounded-lg p-4">
                  <h3 className="text-white font-semibold mb-3 flex items-center">
                    <Settings className="mr-2 text-yellow-400" size={18} />
                    Business Logic
                  </h3>
                  <p className="text-gray-300 leading-relaxed">
                    {workflow.businessLogic}
                  </p>
                </div>
              )}

              {/* Error Handling */}
              {workflow.errorHandling && (
                <div className="bg-gray-800/30 rounded-lg p-4">
                  <h3 className="text-white font-semibold mb-3 flex items-center">
                    <AlertCircle className="mr-2 text-red-400" size={18} />
                    Error Handling
                  </h3>
                  <p className="text-gray-300 leading-relaxed">
                    {workflow.errorHandling}
                  </p>
                </div>
              )}

              {/* Category and Use Case */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-gray-800/30 rounded-lg p-4">
                  <h3 className="text-white font-semibold mb-3 flex items-center">
                    <Tag className="mr-2" size={18} />
                    Category & Tags
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getCategoryColor(workflow.category)}`}>
                        {workflow.category}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {workflow.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="bg-gray-700/50 text-gray-300 px-2 py-1 rounded text-sm border border-gray-600"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-800/30 rounded-lg p-4">
                  <h3 className="text-white font-semibold mb-3 flex items-center">
                    <FileText className="mr-2" size={18} />
                    Use Case
                  </h3>
                  <p className="text-gray-300 leading-relaxed">
                    {workflow.useCase}
                  </p>
                </div>
              </div>

              {/* Integrations */}
              {workflow.integrations.length > 0 && (
                <div className="bg-gray-800/30 rounded-lg p-4">
                  <h3 className="text-white font-semibold mb-3 flex items-center">
                    <Globe className="mr-2" size={18} />
                    Integrations ({workflow.integrations.length})
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {workflow.integrations.map((integration, index) => (
                      <div
                        key={index}
                        className="bg-gray-700/50 border border-gray-600 rounded-lg p-3 text-center"
                      >
                        <div className="text-white font-medium">{integration}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Triggers and Actions */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-gray-800/30 rounded-lg p-4">
                  <h3 className="text-white font-semibold mb-3 flex items-center">
                    <Zap className="mr-2 text-yellow-400" size={18} />
                    Triggers ({workflow.triggers.length})
                  </h3>
                  <div className="space-y-2">
                    {workflow.triggers.length > 0 ? workflow.triggers.map((trigger, index) => (
                      <div key={index} className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-2">
                        <span className="text-yellow-300 font-mono text-sm">{trigger}</span>
                      </div>
                    )) : (
                      <span className="text-gray-500">No triggers found</span>
                    )}
                  </div>
                </div>
                
                <div className="bg-gray-800/30 rounded-lg p-4">
                  <h3 className="text-white font-semibold mb-3 flex items-center">
                    <Activity className="mr-2 text-green-400" size={18} />
                    Actions ({workflow.actions.length})
                  </h3>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {workflow.actions.length > 0 ? workflow.actions.slice(0, 10).map((action, index) => (
                      <div key={index} className="bg-green-500/10 border border-green-500/30 rounded-lg p-2">
                        <span className="text-green-300 font-mono text-sm">{action}</span>
                      </div>
                    )) : (
                      <span className="text-gray-500">No actions found</span>
                    )}
                    {workflow.actions.length > 10 && (
                      <div className="text-gray-400 text-sm">
                        ... and {workflow.actions.length - 10} more actions
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Metadata */}
              <div className="bg-gray-800/30 rounded-lg p-4">
                <h3 className="text-white font-semibold mb-3 flex items-center">
                  <Calendar className="mr-2" size={18} />
                  Metadata
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">Last Analyzed:</span>
                    <div className="text-white">
                      {new Date(workflow.lastAnalyzed).toLocaleDateString()}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-400">Analysis Type:</span>
                    <div className="text-white">
                      {workflow.aiGenerated ? 'AI Generated' : 'Basic Analysis'}
                    </div>
                  </div>
                  {workflow.filePath && (
                    <div>
                      <span className="text-gray-400">File Path:</span>
                      <div className="text-white font-mono text-xs truncate">
                        {workflow.filePath}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'logic' && (
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-white mb-4">
                Workflow Logic & Flow Analysis
              </h3>

              {/* Data Transformations */}
              {workflow.dataTransformations && workflow.dataTransformations.length > 0 && (
                <div className="bg-gray-800/30 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-3 flex items-center">
                    <Code className="mr-2 text-blue-400" size={18} />
                    Data Transformations ({workflow.dataTransformations.length})
                  </h4>
                  <div className="space-y-2">
                    {workflow.dataTransformations.map((transformation, index) => (
                      <div key={index} className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                        <span className="text-blue-300 text-sm">{transformation}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Conditional Logic */}
              {workflow.conditionalLogic && workflow.conditionalLogic.length > 0 && (
                <div className="bg-gray-800/30 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-3 flex items-center">
                    <GitBranch className="mr-2 text-yellow-400" size={18} />
                    Conditional Logic ({workflow.conditionalLogic.length})
                  </h4>
                  <div className="space-y-2">
                    {workflow.conditionalLogic.map((condition, index) => (
                      <div key={index} className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                        <span className="text-yellow-300 text-sm">{condition}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Loops and Iterations */}
              {workflow.loopsAndIterations && workflow.loopsAndIterations.length > 0 && (
                <div className="bg-gray-800/30 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-3 flex items-center">
                    <Activity className="mr-2 text-purple-400" size={18} />
                    Loops & Iterations ({workflow.loopsAndIterations.length})
                  </h4>
                  <div className="space-y-2">
                    {workflow.loopsAndIterations.map((loop, index) => (
                      <div key={index} className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3">
                        <span className="text-purple-300 text-sm">{loop}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Webhook URLs */}
              {workflow.webhookUrls && workflow.webhookUrls.length > 0 && (
                <div className="bg-gray-800/30 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-3 flex items-center">
                    <Globe className="mr-2 text-green-400" size={18} />
                    Webhook Endpoints ({workflow.webhookUrls.length})
                  </h4>
                  <div className="space-y-2">
                    {workflow.webhookUrls.map((url, index) => (
                      <div key={index} className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                        <span className="text-green-300 text-sm font-mono">{url}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Schedules */}
              {workflow.schedules && workflow.schedules.length > 0 && (
                <div className="bg-gray-800/30 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-3 flex items-center">
                    <Clock className="mr-2 text-cyan-400" size={18} />
                    Scheduled Executions ({workflow.schedules.length})
                  </h4>
                  <div className="space-y-2">
                    {workflow.schedules.map((schedule, index) => (
                      <div key={index} className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-3">
                        <span className="text-cyan-300 text-sm font-mono">{schedule}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty State */}
              {(!workflow.dataTransformations || workflow.dataTransformations.length === 0) &&
               (!workflow.conditionalLogic || workflow.conditionalLogic.length === 0) &&
               (!workflow.loopsAndIterations || workflow.loopsAndIterations.length === 0) &&
               (!workflow.webhookUrls || workflow.webhookUrls.length === 0) &&
               (!workflow.schedules || workflow.schedules.length === 0) && (
                <div className="text-center py-8">
                  <GitBranch className="mx-auto text-gray-600 mb-4" size={48} />
                  <p className="text-gray-400">No advanced logic patterns detected in this workflow</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'nodes' && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-white mb-4">
                Node Breakdown ({workflow.nodes?.length || 0} types)
              </h3>
              <div className="grid gap-4">
                {workflow.nodes && Array.isArray(workflow.nodes) && workflow.nodes.length > 0 ? 
                  workflow.nodes.map((node, index) => (
                    <div key={index} className="bg-gray-800/50 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="text-white font-semibold">{node.type}</h4>
                          <p className="text-gray-400 text-sm mt-1">
                            Names: {node.name}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-white font-semibold text-lg">{node.count}</div>
                          <div className="text-gray-400 text-sm">instances</div>
                        </div>
                      </div>
                    </div>
                  ))
                  : 
                  <div className="text-gray-400 text-center py-8">
                    No node information available
                  </div>
                }
              </div>
            </div>
          )}

          {activeTab === 'dependencies' && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-white mb-4">
                Dependencies ({workflow.dependencies.length})
              </h3>
              <div className="grid gap-3">
                {workflow.dependencies.map((dependency, index) => {
                  if (!dependency || typeof dependency !== 'string') return null;
                  
                  const isCredential = dependency.startsWith('credential:');
                  const isService = dependency.startsWith('service:');
                  const isDatabase = dependency.startsWith('database:');
                  
                  let bgColor = 'bg-gray-800/50';
                  let textColor = 'text-gray-300';
                  let icon = <Database size={16} />;
                  
                  if (isCredential) {
                    bgColor = 'bg-yellow-500/10 border border-yellow-500/30';
                    textColor = 'text-yellow-300';
                    icon = <Settings size={16} className="text-yellow-400" />;
                  } else if (isService) {
                    bgColor = 'bg-blue-500/10 border border-blue-500/30';
                    textColor = 'text-blue-300';
                    icon = <Globe size={16} className="text-blue-400" />;
                  } else if (isDatabase) {
                    bgColor = 'bg-purple-500/10 border border-purple-500/30';
                    textColor = 'text-purple-300';
                    icon = <Database size={16} className="text-purple-400" />;
                  }
                  
                  return (
                    <div key={index} className={`rounded-lg p-3 ${bgColor}`}>
                      <div className="flex items-center space-x-3">
                        {icon}
                        <span className={`font-mono text-sm ${textColor}`}>
                          {dependency}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'diagram' && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
                <Workflow className="mr-2 text-green-400" size={20} />
                Visual Workflow Diagram
              </h3>
              <div className="text-gray-400 text-sm mb-4">
                Interactive diagram showing the workflow structure with n8n-style visualization
              </div>
              {workflow.workflowData && (
                <WorkflowDiagramReactFlow workflow={workflow.workflowData} autoRender={true} />
              )}
              {!workflow.workflowData && (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                  <div className="flex items-center">
                    <AlertCircle className="text-yellow-400 mr-2" size={18} />
                    <span className="text-yellow-300">
                      Original workflow data not available for visualization
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'raw' && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-white mb-4">
                Raw Analysis Data
              </h3>
              <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                <pre className="text-gray-300 text-sm whitespace-pre-wrap">
                  {JSON.stringify(workflow, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}