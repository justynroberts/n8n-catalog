import { N8nWorkflow, N8nNode, WorkflowAnalysis } from '@/types/workflow';

export class WorkflowParser {
  static parseWorkflowFile(content: string, filePath?: string): N8nWorkflow | null {
    try {
      const parsed = JSON.parse(content);
      
      // Handle different n8n export formats
      if (parsed.workflows && Array.isArray(parsed.workflows)) {
        // Multiple workflows export format
        return parsed.workflows[0];
      } else if (parsed.nodes && Array.isArray(parsed.nodes)) {
        // Single workflow format
        return parsed as N8nWorkflow;
      } else if (parsed.data && parsed.data.nodes) {
        // Some n8n exports wrap in data object
        return parsed.data as N8nWorkflow;
      }
      
      return null;
    } catch (error) {
      console.error('Failed to parse workflow:', error);
      return null;
    }
  }

  static extractNodes(workflow: N8nWorkflow): { type: string; count: number; name: string }[] {
    const nodeTypes = new Map<string, { count: number; names: Set<string> }>();
    
    workflow.nodes.forEach(node => {
      const current = nodeTypes.get(node.type) || { count: 0, names: new Set() };
      current.count++;
      current.names.add(node.name);
      nodeTypes.set(node.type, current);
    });
    
    return Array.from(nodeTypes.entries()).map(([type, data]) => ({
      type,
      count: data.count,
      name: Array.from(data.names).join(', ')
    }));
  }

  static extractDependencies(workflow: N8nWorkflow): string[] {
    const dependencies = new Set<string>();
    
    workflow.nodes.forEach(node => {
      // Extract node type as dependency
      dependencies.add(node.type);
      
      // Extract credentials
      if (node.credentials) {
        Object.keys(node.credentials).forEach(cred => dependencies.add(`credential:${cred}`));
      }
      
      // Extract specific parameters that indicate external dependencies
      if (node.parameters) {
        this.extractParameterDependencies(node.parameters, dependencies);
      }
    });
    
    return Array.from(dependencies);
  }

  private static extractParameterDependencies(params: any, dependencies: Set<string>): void {
    if (typeof params !== 'object' || !params) return;
    
    for (const [key, value] of Object.entries(params)) {
      if (typeof value === 'string') {
        // Look for common dependency patterns
        if (key.toLowerCase().includes('url') && typeof value === 'string') {
          try {
            const url = new URL(value);
            dependencies.add(`service:${url.hostname}`);
          } catch {
            // Not a valid URL, skip
          }
        }
        
        // Look for database connections
        if (key.toLowerCase().includes('database') || key.toLowerCase().includes('connection')) {
          dependencies.add(`database:${value}`);
        }
      } else if (typeof value === 'object') {
        this.extractParameterDependencies(value, dependencies);
      }
    }
  }

  static extractTriggers(workflow: N8nWorkflow): string[] {
    if (!workflow.nodes) return [];
    return workflow.nodes
      .filter(node => node.type && this.isTriggerNode(node.type))
      .map(node => node.type);
  }

  static extractActions(workflow: N8nWorkflow): string[] {
    if (!workflow.nodes) return [];
    return workflow.nodes
      .filter(node => node.type && !this.isTriggerNode(node.type) && !this.isUtilityNode(node.type))
      .map(node => node.type);
  }

  static extractIntegrations(workflow: N8nWorkflow): string[] {
    const integrations = new Set<string>();
    
    if (!workflow.nodes) return [];
    
    workflow.nodes.forEach(node => {
      if (!node.type) return;
      const integration = this.getIntegrationFromNodeType(node.type);
      if (integration) {
        integrations.add(integration);
      }
    });
    
    return Array.from(integrations);
  }

  private static isTriggerNode(nodeType: string): boolean {
    if (!nodeType || typeof nodeType !== 'string') {
      return false;
    }
    
    const triggerTypes = [
      'webhook', 'cron', 'trigger', 'start', 'manual',
      'httpRequest', 'emailTrigger', 'fileTrigger'
    ];
    
    return triggerTypes.some(trigger => 
      nodeType.toLowerCase().includes(trigger.toLowerCase())
    );
  }

  private static isUtilityNode(nodeType: string): boolean {
    if (!nodeType || typeof nodeType !== 'string') {
      return false;
    }
    
    const utilityTypes = [
      'set', 'if', 'switch', 'merge', 'wait', 'function',
      'code', 'split', 'aggregate', 'limit', 'sort'
    ];
    
    return utilityTypes.some(utility => 
      nodeType.toLowerCase().includes(utility.toLowerCase())
    );
  }

  private static getIntegrationFromNodeType(nodeType: string): string | null {
    // Map common node types to their integrations
    const integrationMap: Record<string, string> = {
      'slack': 'Slack',
      'gmail': 'Gmail',
      'sheets': 'Google Sheets',
      'drive': 'Google Drive',
      'dropbox': 'Dropbox',
      'github': 'GitHub',
      'gitlab': 'GitLab',
      'jira': 'Jira',
      'trello': 'Trello',
      'notion': 'Notion',
      'airtable': 'Airtable',
      'hubspot': 'HubSpot',
      'salesforce': 'Salesforce',
      'stripe': 'Stripe',
      'shopify': 'Shopify',
      'wordpress': 'WordPress',
      'mysql': 'MySQL',
      'postgres': 'PostgreSQL',
      'mongodb': 'MongoDB',
      'redis': 'Redis',
      'telegram': 'Telegram',
      'discord': 'Discord',
      'twitter': 'Twitter',
      'facebook': 'Facebook',
      'linkedin': 'LinkedIn',
      'zoom': 'Zoom',
      'teams': 'Microsoft Teams'
    };
    
    const lowerNodeType = nodeType.toLowerCase();
    
    for (const [key, integration] of Object.entries(integrationMap)) {
      if (lowerNodeType.includes(key)) {
        return integration;
      }
    }
    
    return null;
  }

  static calculateComplexity(workflow: N8nWorkflow): 'Simple' | 'Medium' | 'Complex' {
    const nodeCount = workflow.nodes?.length || 0;
    const connectionCount = workflow.connections ? Object.keys(workflow.connections).length : 0;
    const hasLogic = workflow.nodes?.some(node => 
      node.type && ['if', 'switch', 'function', 'code'].some(type => 
        node.type.toLowerCase().includes(type)
      )
    ) || false;
    
    if (nodeCount <= 5 && !hasLogic) return 'Simple';
    if (nodeCount <= 15 && connectionCount <= 20) return 'Medium';
    return 'Complex';
  }

  static estimateRuntime(workflow: N8nWorkflow): string {
    if (!workflow.nodes) return '< 5 seconds';
    
    const nodeCount = workflow.nodes.length;
    const hasWaitNodes = workflow.nodes.some(node => 
      node.type && node.type.toLowerCase().includes('wait')
    );
    const hasApiNodes = workflow.nodes.some(node => 
      node.type && ['http', 'webhook', 'api'].some(type => 
        node.type.toLowerCase().includes(type)
      )
    );
    
    if (hasWaitNodes) return '> 1 minute';
    if (hasApiNodes && nodeCount > 10) return '30-60 seconds';
    if (nodeCount > 20) return '10-30 seconds';
    if (nodeCount > 5) return '5-10 seconds';
    return '< 5 seconds';
  }

  static extractWebhookUrls(workflow: N8nWorkflow): string[] {
    const webhookUrls: string[] = [];
    
    if (!workflow.nodes) return webhookUrls;
    
    workflow.nodes.forEach(node => {
      if (node.type && node.type.toLowerCase().includes('webhook') && node.parameters) {
        if (node.parameters.path) {
          webhookUrls.push(`/webhook/${node.parameters.path}`);
        }
        if (node.parameters.webhookId) {
          webhookUrls.push(`/webhook/${node.parameters.webhookId}`);
        }
      }
    });
    
    return webhookUrls;
  }

  static extractSchedules(workflow: N8nWorkflow): string[] {
    const schedules: string[] = [];
    
    if (!workflow.nodes) return schedules;
    
    workflow.nodes.forEach(node => {
      if (node.type && node.type.toLowerCase().includes('cron') && node.parameters) {
        if (node.parameters.rule) {
          schedules.push(node.parameters.rule);
        }
        if (node.parameters.expression) {
          schedules.push(node.parameters.expression);
        }
      }
      
      if (node.type && node.type.toLowerCase().includes('schedule') && node.parameters) {
        if (node.parameters.rule) {
          schedules.push(node.parameters.rule);
        }
      }
    });
    
    return schedules;
  }

  static extractConditionalLogic(workflow: N8nWorkflow): string[] {
    const conditions: string[] = [];
    
    if (!workflow.nodes) return conditions;
    
    workflow.nodes.forEach(node => {
      if (node.type && node.type.toLowerCase().includes('if') && node.parameters) {
        if (node.parameters.conditions) {
          // Extract condition descriptions
          const conditionStr = JSON.stringify(node.parameters.conditions);
          conditions.push(`IF condition in ${node.name || 'unnamed node'}`);
        }
      }
      
      if (node.type && node.type.toLowerCase().includes('switch') && node.parameters) {
        if (node.parameters.rules) {
          conditions.push(`SWITCH logic in ${node.name || 'unnamed node'}`);
        }
      }
    });
    
    return conditions;
  }

  static extractLoopsAndIterations(workflow: N8nWorkflow): string[] {
    const loops: string[] = [];
    
    if (!workflow.nodes) return loops;
    
    workflow.nodes.forEach(node => {
      if (node.type && node.type.toLowerCase().includes('split') && node.parameters) {
        loops.push(`Split data processing in ${node.name || 'unnamed node'}`);
      }
      
      if (node.type && node.type.toLowerCase().includes('function') && node.parameters) {
        // Check if function code contains loops
        const code = node.parameters.code || node.parameters.jsCode || '';
        if (typeof code === 'string') {
          if (code.includes('for') || code.includes('while') || code.includes('forEach')) {
            loops.push(`Loop logic in ${node.name || 'unnamed node'}`);
          }
        }
      }
    });
    
    return loops;
  }

  static extractDataTransformations(workflow: N8nWorkflow): string[] {
    const transformations: string[] = [];
    
    workflow.nodes.forEach(node => {
      if (!node.type || typeof node.type !== 'string') {
        return;
      }
      
      if (node.type.toLowerCase().includes('set') && node.parameters) {
        transformations.push(`Data transformation in ${node.name || 'unnamed node'}`);
      }
      
      if (node.type.toLowerCase().includes('function') && node.parameters) {
        transformations.push(`Custom function in ${node.name || 'unnamed node'}`);
      }
      
      if (node.type.toLowerCase().includes('code') && node.parameters) {
        transformations.push(`Code execution in ${node.name || 'unnamed node'}`);
      }
      
      if (node.type.toLowerCase().includes('merge') && node.parameters) {
        transformations.push(`Data merging in ${node.name}`);
      }
    });
    
    return transformations;
  }
}