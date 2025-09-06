'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  MarkerType,
  Position,
  NodeTypes,
  Handle,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { N8nWorkflow } from '@/types/workflow';
import { Eye, EyeOff, Download, Maximize2 } from 'lucide-react';

interface WorkflowDiagramProps {
  workflow: N8nWorkflow;
  className?: string;
  autoRender?: boolean;
}

// Custom Node Component with accurate n8n styling
function WorkflowNode({ data, isConnectable }: { data: any; isConnectable?: boolean }) {
  const nodeColors = getNodeColors(data.nodeType);
  const [showDetails, setShowDetails] = useState(false);
  
  return (
    <div className="relative">
      {/* Input Handle (left side, exactly like n8n) */}
      <Handle 
        type="target" 
        position={Position.Left} 
        isConnectable={isConnectable}
        className="w-2 h-2 !border-0 !bg-gray-500 rounded-full opacity-0 hover:opacity-100 transition-opacity"
        style={{ left: '-4px', top: '50%', transform: 'translateY(-50%)' }}
      />
      
      {/* Node Body - exact n8n dimensions and styling */}
      <div 
        className="relative rounded-lg text-white shadow-md hover:shadow-lg transition-shadow cursor-pointer"
        style={{
          width: '100px',
          height: '100px',
          background: nodeColors.background,
          border: `2px solid ${nodeColors.border}`,
        }}
        onMouseEnter={() => setShowDetails(true)}
        onMouseLeave={() => setShowDetails(false)}
      >
        {/* Node Icon Circle - top center like n8n */}
        <div className="absolute top-3 left-1/2 transform -translate-x-1/2">
          <div 
            className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
            style={{ backgroundColor: nodeColors.icon }}
          >
            {getNodeIcon(data.nodeType)}
          </div>
        </div>
        
        {/* Node Label - bottom area like n8n */}
        <div className="absolute bottom-2 left-1 right-1">
          <div className="text-xs font-medium text-center leading-tight px-1">
            {data.label}
          </div>
        </div>
        
        {/* Execution indicators (small dots) - like n8n */}
        <div className="absolute top-1 right-1">
          <div className="w-2 h-2 rounded-full bg-green-400 opacity-75"></div>
        </div>
      </div>
      
      {/* Sticky Note Details - appears on hover */}
      {showDetails && (
        <div className="absolute z-50 bg-yellow-200 text-gray-800 p-3 rounded-lg shadow-lg border-l-4 border-yellow-500 min-w-48 max-w-64"
             style={{ 
               top: '-20px', 
               left: '110px',
               fontSize: '11px',
               fontFamily: 'monospace'
             }}>
          {/* Sticky note header */}
          <div className="flex items-center gap-2 mb-2 border-b border-yellow-400 pb-1">
            <span className="font-bold text-yellow-700">📝</span>
            <span className="font-bold text-sm">{data.type}</span>
          </div>
          
          {/* Node details */}
          <div className="space-y-1">
            <div><strong>Name:</strong> {data.label}</div>
            <div><strong>Type:</strong> {data.nodeType}</div>
            {data.parameters && (
              <div className="mt-2">
                <strong>Config:</strong>
                <div className="text-xs bg-yellow-100 p-1 rounded mt-1 max-h-20 overflow-y-auto">
                  {Object.entries(data.parameters).slice(0, 3).map(([key, value]) => (
                    <div key={key} className="truncate">
                      {key}: {typeof value === 'string' ? value.substring(0, 30) : JSON.stringify(value).substring(0, 30)}
                    </div>
                  ))}
                  {Object.keys(data.parameters).length > 3 && (
                    <div className="text-yellow-600">...and {Object.keys(data.parameters).length - 3} more</div>
                  )}
                </div>
              </div>
            )}
          </div>
          
          {/* Sticky note corner fold */}
          <div className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-300 transform rotate-45 border-r border-b border-yellow-400"></div>
        </div>
      )}
      
      {/* Output Handle (right side, exactly like n8n) */}
      <Handle 
        type="source" 
        position={Position.Right} 
        isConnectable={isConnectable}
        className="w-2 h-2 !border-0 !bg-gray-500 rounded-full opacity-0 hover:opacity-100 transition-opacity"
        style={{ right: '-4px', top: '50%', transform: 'translateY(-50%)' }}
      />
    </div>
  );
}

function getNodeColors(nodeType: string): { background: string; border: string; icon: string } {
  const type = nodeType?.toLowerCase() || '';
  
  if (type.includes('trigger') || type.includes('webhook') || type.includes('cron') || type.includes('start')) {
    return {
      background: 'linear-gradient(135deg, #FF6B6B 0%, #FF5252 100%)',
      border: '#FF4444',
      icon: '#CC3333'
    };
  } else if (type.includes('if') || type.includes('switch')) {
    return {
      background: 'linear-gradient(135deg, #9C88FF 0%, #7C4DFF 100%)',
      border: '#6A5ACD',
      icon: '#5A4FCF'
    };
  } else if (type.includes('function') || type.includes('code')) {
    return {
      background: 'linear-gradient(135deg, #66BB6A 0%, #4CAF50 100%)',
      border: '#2E7D32',
      icon: '#1B5E20'
    };
  } else if (type.includes('http') || type.includes('request')) {
    return {
      background: 'linear-gradient(135deg, #FF9800 0%, #F57C00 100%)',
      border: '#E65100',
      icon: '#BF360C'
    };
  } else if (type.includes('sheets') || type.includes('google')) {
    return {
      background: 'linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%)',
      border: '#1B5E20',
      icon: '#0D4F0D'
    };
  } else if (type.includes('slack')) {
    return {
      background: 'linear-gradient(135deg, #E91E63 0%, #C2185B 100%)',
      border: '#AD1457',
      icon: '#880E4F'
    };
  } else {
    return {
      background: 'linear-gradient(135deg, #42A5F5 0%, #1E88E5 100%)',
      border: '#1565C0',
      icon: '#0D47A1'
    };
  }
}

function getNodeIcon(nodeType: string): string {
  const type = nodeType?.toLowerCase() || '';
  
  if (type.includes('start')) return '▶';
  if (type.includes('webhook')) return '🔗';
  if (type.includes('function')) return 'ƒ';
  if (type.includes('http') || type.includes('request')) return '🌐';
  if (type.includes('if')) return '?';
  if (type.includes('sheets')) return '📊';
  if (type.includes('slack')) return '💬';
  if (type.includes('trigger')) return '⚡';
  
  return '⚙';
}

const nodeTypes: NodeTypes = {
  workflowNode: WorkflowNode,
};

export function WorkflowDiagramReactFlow({ workflow, className = '', autoRender = false }: WorkflowDiagramProps) {
  const [isVisible, setIsVisible] = useState(autoRender);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Helper functions
  const sanitizeNodeId = (name: string): string => {
    return name.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20);
  };

  const truncateLabel = (label: string): string => {
    return label.length > 20 ? label.substring(0, 17) + '...' : label;
  };

  // Generate nodes and edges from workflow data  
  const { generatedNodes, generatedEdges } = useMemo(() => {
    if (!workflow?.nodes || !workflow?.connections) {
      return { generatedNodes: [], generatedEdges: [] };
    }

    const nodeMap = new Map();
    
    // Create nodes
    const generatedNodes: Node[] = workflow.nodes.map((node, index) => {
      const nodeId = sanitizeNodeId(node.name);
      nodeMap.set(node.name, nodeId);
      
      return {
        id: nodeId,
        type: 'workflowNode',
        position: node.position ? 
          { x: node.position[0] || index * 200, y: node.position[1] || 0 } :
          { x: index * 200, y: 0 },
        data: {
          label: truncateLabel(node.name),
          type: node.type?.split('.').pop() || 'Node',
          nodeType: node.type || 'unknown',
          parameters: node.parameters || {}
        },
      };
    });

    // Create edges
    const generatedEdges: Edge[] = [];
    let edgeId = 0;

    Object.entries(workflow.connections || {}).forEach(([sourceNode, connections]: [string, any]) => {
      const sourceId = nodeMap.get(sourceNode);
      if (!sourceId) return;

      // Handle n8n connection structure: connections.main[outputIndex][connectionIndex]
      if (connections?.main && Array.isArray(connections.main)) {
        connections.main.forEach((outputConnections: any[], outputIndex: number) => {
          if (Array.isArray(outputConnections)) {
            outputConnections.forEach((conn: any) => {
              if (conn?.node) {
                const targetId = nodeMap.get(conn.node);
                if (targetId) {
                  generatedEdges.push({
                    id: `edge-${edgeId++}`,
                    source: sourceId,
                    target: targetId,
                    sourceHandle: outputIndex > 0 ? `output-${outputIndex}` : undefined,
                    targetHandle: conn.index > 0 ? `input-${conn.index}` : undefined,
                    type: 'smoothstep',
                    animated: false,
                    style: { 
                      stroke: '#999999', 
                      strokeWidth: 2,
                      strokeDasharray: '0'
                    },
                    markerEnd: {
                      type: MarkerType.ArrowClosed,
                      color: '#999999',
                      width: 12,
                      height: 12
                    },
                  });
                }
              }
            });
          }
        });
      }
    });

    return { generatedNodes, generatedEdges };
  }, [workflow]);

  // Update React Flow when data changes
  useEffect(() => {
    if (isVisible && generatedNodes.length > 0) {
      setNodes(generatedNodes);
      setEdges(generatedEdges);
    }
  }, [isVisible, generatedNodes, generatedEdges, setNodes, setEdges]);

  const toggleVisibility = useCallback(() => {
    setIsVisible(!isVisible);
  }, [isVisible]);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(!isFullscreen);
  }, [isFullscreen]);

  const downloadDiagram = useCallback(() => {
    // Simple implementation - could be enhanced with html2canvas or similar
    console.log('Download diagram feature - to be implemented');
  }, []);

  if (!workflow?.nodes || workflow.nodes.length === 0) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="flex items-center justify-between">
          <button
            onClick={toggleVisibility}
            className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm text-white transition-colors"
          >
            {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {isVisible ? 'Hide' : 'Show'} Workflow Diagram
          </button>
        </div>
        {isVisible && (
          <div className="glass-card p-4">
            <p className="text-gray-400 text-center">
              No workflow data available for visualization. Import some workflows to see the React Flow diagram.
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <div className={`space-y-4 ${className}`}>
        <div className="flex items-center justify-between">
          <button
            onClick={toggleVisibility}
            className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm text-white transition-colors"
          >
            {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {isVisible ? 'Hide' : 'Show'} Workflow Diagram
          </button>
          
          {isVisible && (
            <div className="flex gap-2">
              <button
                onClick={toggleFullscreen}
                className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm text-white transition-colors"
                title="Fullscreen view"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
              <button
                onClick={downloadDiagram}
                className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm text-white transition-colors"
                title="Download diagram"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {isVisible && (
          <div className="glass-card p-4">
            <div 
              className="w-full bg-slate-900 rounded-lg overflow-hidden"
              style={{ height: '500px' }}
            >
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                nodeTypes={nodeTypes}
                fitView
                fitViewOptions={{ padding: 0.2 }}
                className="bg-slate-900"
                nodesDraggable={true}
                nodesConnectable={false}
                elementsSelectable={true}
              >
                <Background 
                  variant={'dots' as any} 
                  gap={20} 
                  size={1}
                  color="#374151"
                />
                <Controls 
                  style={{
                    background: '#1e293b',
                    border: '1px solid #475569',
                    borderRadius: '8px'
                  }}
                />
              </ReactFlow>
            </div>
          </div>
        )}
      </div>

      {/* Fullscreen Modal */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center">
          <div className="w-full h-full p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">
                {workflow.name || 'Workflow'} - Visual Diagram
              </h2>
              <button
                onClick={toggleFullscreen}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white transition-colors"
              >
                Close
              </button>
            </div>
            <div className="w-full h-[calc(100%-60px)] bg-slate-900 rounded-lg overflow-hidden">
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                nodeTypes={nodeTypes}
                fitView
                fitViewOptions={{ padding: 0.1 }}
                className="bg-slate-900"
                nodesDraggable={true}
                nodesConnectable={false}
                elementsSelectable={true}
              >
                <Background 
                  variant={'dots' as any} 
                  gap={20} 
                  size={1}
                  color="#374151"
                />
                <Controls 
                  style={{
                    background: '#1e293b',
                    border: '1px solid #475569',
                    borderRadius: '8px'
                  }}
                />
              </ReactFlow>
            </div>
          </div>
        </div>
      )}
    </>
  );
}