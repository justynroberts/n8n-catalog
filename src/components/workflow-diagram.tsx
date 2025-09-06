'use client';

import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { N8nWorkflow } from '@/types/workflow';
import { Eye, EyeOff, Copy, Download } from 'lucide-react';

interface WorkflowDiagramProps {
  workflow: N8nWorkflow;
  className?: string;
}

export function WorkflowDiagram({ workflow, className = '' }: WorkflowDiagramProps) {
  const mermaidRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [mermaidCode, setMermaidCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Initialize Mermaid with n8n-like styling
    mermaid.initialize({
      startOnLoad: true,
      theme: 'base',
      themeVariables: {
        background: '#2a2a2a',
        primaryColor: '#ff6d5a', // n8n's signature red-orange
        primaryTextColor: '#ffffff',
        primaryBorderColor: '#555555',
        lineColor: '#999999',
        secondaryColor: '#404040',
        tertiaryColor: '#2a2a2a',
        nodeBkg: '#404040',
        nodeTextColor: '#ffffff',
        edgeLabelBackground: '#2a2a2a',
      },
      flowchart: {
        htmlLabels: true,
        curve: 'linear', // n8n uses straight lines
        padding: 20,
        nodeSpacing: 50,
        rankSpacing: 80,
      },
    });

    // Cleanup function to prevent DOM manipulation issues
    return () => {
      if (mermaidRef.current) {
        mermaidRef.current.innerHTML = '';
      }
    };
  }, []);

  const generateMermaidCode = (workflow: N8nWorkflow): string => {
    if (!workflow.nodes || !workflow.connections) {
      return 'graph TD\n    A[No workflow data available]';
    }

    const lines: string[] = ['graph TD'];
    const nodeMap = new Map<string, any>();
    
    // Build node map
    workflow.nodes.forEach(node => {
      nodeMap.set(node.name, node);
    });

    // Add nodes with n8n-style rounded rectangles and class styling
    workflow.nodes.forEach(node => {
      const nodeId = sanitizeNodeId(node.name);
      const nodeType = node.type || 'unknown';
      const shape = getNodeShape(nodeType);
      const nodeClass = getNodeClass(nodeType);
      const label = truncateLabel(node.name);
      const typeLabel = nodeType.split('.').pop() || nodeType; // Show just the node type
      
      // Create node with type and name
      lines.push(`    ${nodeId}${shape.start}"<b>${typeLabel}</b><br/>${label}"${shape.end}`);
      lines.push(`    class ${nodeId} ${nodeClass}`);
    });

    // Add connections
    Object.entries(workflow.connections || {}).forEach(([sourceNode, connections]) => {
      const sourceId = sanitizeNodeId(sourceNode);
      
      if (Array.isArray(connections)) {
        connections.forEach((connection: any) => {
          if (connection && Array.isArray(connection)) {
            connection.forEach((conn: any) => {
              if (conn && conn.node) {
                const targetId = sanitizeNodeId(conn.node);
                const outputIndex = conn.outputIndex || 0;
                const inputIndex = conn.inputIndex || 0;
                
                // Add edge label if multiple outputs/inputs
                const edgeLabel = outputIndex > 0 || inputIndex > 0 ? 
                  `|"${outputIndex}→${inputIndex}"|` : '';
                
                lines.push(`    ${sourceId} -->${edgeLabel} ${targetId}`);
              }
            });
          }
        });
      }
    });

    // Add n8n-style CSS classes for different node types
    lines.push('');
    lines.push('    classDef trigger-node fill:#ff6d5a,stroke:#ff4444,stroke-width:2px,color:#fff');
    lines.push('    classDef condition-node fill:#7b68ee,stroke:#6a5acd,stroke-width:2px,color:#fff');
    lines.push('    classDef code-node fill:#32cd32,stroke:#228b22,stroke-width:2px,color:#fff');
    lines.push('    classDef api-node fill:#ff8c00,stroke:#ff7f00,stroke-width:2px,color:#fff');
    lines.push('    classDef regular-node fill:#4682b4,stroke:#4169e1,stroke-width:2px,color:#fff');

    return lines.join('\n');
  };

  const sanitizeNodeId = (name: string): string => {
    return name.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20);
  };

  const truncateLabel = (label: string): string => {
    return label.length > 20 ? label.substring(0, 17) + '...' : label;
  };

  const getNodeShape = (nodeType: string): { start: string; end: string; class?: string } => {
    const type = nodeType.toLowerCase();
    
    // n8n uses rounded rectangles for all nodes, differentiated by color
    return { start: '(', end: ')' }; // Rounded rectangle for all nodes (n8n style)
  };

  const getNodeClass = (nodeType: string): string => {
    const type = nodeType.toLowerCase();
    
    if (type.includes('trigger') || type.includes('webhook') || type.includes('cron')) {
      return 'trigger-node';
    } else if (type.includes('if') || type.includes('switch')) {
      return 'condition-node';
    } else if (type.includes('function') || type.includes('code')) {
      return 'code-node';
    } else if (type.includes('http') || type.includes('api')) {
      return 'api-node';
    } else {
      return 'regular-node';
    }
  };

  const renderDiagram = async () => {
    if (!mermaidRef.current || !workflow) return;

    setIsLoading(true);
    setError('');

    try {
      const code = generateMermaidCode(workflow);
      setMermaidCode(code);

      // Create a completely isolated container
      const container = mermaidRef.current;
      if (!container || !document.body.contains(container)) {
        throw new Error('Container not attached to DOM');
      }

      // Clear previous diagram safely
      container.innerHTML = '';
      
      // Generate unique ID for this diagram
      const uniqueId = `mermaid-diagram-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Create a temporary div for Mermaid to render into
      const tempDiv = document.createElement('div');
      tempDiv.id = uniqueId;
      tempDiv.style.display = 'none';
      document.body.appendChild(tempDiv);

      try {
        // Render the diagram into the temporary container
        const { svg } = await mermaid.render(uniqueId, code);
        
        // Only update the DOM if the container is still valid
        if (container && document.body.contains(container)) {
          container.innerHTML = svg;
        }
      } finally {
        // Always clean up the temporary div
        if (document.body.contains(tempDiv)) {
          document.body.removeChild(tempDiv);
        }
      }

    } catch (err) {
      console.error('Mermaid rendering error:', err);
      setError('Failed to render workflow diagram');
      const container = mermaidRef.current;
      if (container && document.body.contains(container)) {
        container.innerHTML = `<p class="text-red-400 text-sm">Error rendering diagram</p>`;
      }
    } finally {
      setIsLoading(false);
    }
  };

  const toggleVisibility = () => {
    setIsVisible(!isVisible);
    if (!isVisible) {
      // Render diagram when showing for the first time
      setTimeout(() => {
        renderDiagram();
      }, 100);
    }
  };

  const copyMermaidCode = () => {
    if (mermaidCode) {
      navigator.clipboard.writeText(mermaidCode);
    }
  };

  const downloadDiagram = () => {
    if (!mermaidRef.current) return;
    
    const svg = mermaidRef.current.querySelector('svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);
    
    const downloadLink = document.createElement('a');
    downloadLink.href = svgUrl;
    downloadLink.download = `${workflow.name || 'workflow'}-diagram.svg`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(svgUrl);
  };

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
        
        {isVisible && mermaidCode && (
          <div className="flex gap-2">
            <button
              onClick={copyMermaidCode}
              className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm text-white transition-colors"
              title="Copy Mermaid code"
            >
              <Copy className="w-4 h-4" />
            </button>
            <button
              onClick={downloadDiagram}
              className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm text-white transition-colors"
              title="Download as SVG"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {isVisible && (
        <div className="glass-card p-4">
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
              <span className="ml-3 text-gray-400">Generating diagram...</span>
            </div>
          )}
          
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}
          
          <div 
            ref={mermaidRef} 
            className="workflow-diagram overflow-auto"
            style={{ minHeight: '200px' }}
          />
          
          {mermaidCode && !isLoading && !error && (
            <details className="mt-4">
              <summary className="cursor-pointer text-sm text-gray-400 hover:text-gray-300">
                View Mermaid Code
              </summary>
              <pre className="mt-2 p-3 bg-slate-800 rounded text-sm text-gray-300 overflow-x-auto">
                <code>{mermaidCode}</code>
              </pre>
            </details>
          )}
        </div>
      )}
    </div>
  );
}