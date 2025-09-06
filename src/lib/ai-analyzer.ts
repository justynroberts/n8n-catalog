import { N8nWorkflow, WorkflowAnalysis } from '@/types/workflow';
import { WorkflowParser } from './workflow-parser';
import { SQLiteDatabase } from './db/sqlite';

export class AIAnalyzer {
  private apiKey: string;
  private baseUrl: string = 'https://api.openai.com/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async analyzeWorkflow(workflow: N8nWorkflow, filePath?: string): Promise<WorkflowAnalysis> {
    try {
      // Validate workflow input
      if (!workflow || !workflow.nodes || !Array.isArray(workflow.nodes)) {
        throw new Error('Invalid workflow structure');
      }

      // Extract basic metadata first with error handling
      let nodes: { type: string; count: number; name: string }[] = [];
      let dependencies: string[] = [];
      let triggers: string[] = [];
      let actions: string[] = [];
      let integrations: string[] = [];
      let complexity: 'Simple' | 'Medium' | 'Complex' = 'Simple';
      let estimatedRuntime: string = '< 5 seconds';
      
      try {
        nodes = WorkflowParser.extractNodes(workflow);
        dependencies = WorkflowParser.extractDependencies(workflow);
        triggers = WorkflowParser.extractTriggers(workflow);
        actions = WorkflowParser.extractActions(workflow);
        integrations = WorkflowParser.extractIntegrations(workflow);
        complexity = WorkflowParser.calculateComplexity(workflow);
        estimatedRuntime = WorkflowParser.estimateRuntime(workflow);
      } catch (parseError) {
        console.warn('Error extracting workflow metadata:', parseError);
        // Defaults are already set above
      }

      // Prepare workflow summary for AI analysis
      const workflowSummary = this.createWorkflowSummary(workflow, {
        nodes,
        dependencies,
        triggers,
        actions,
        integrations
      });

      // Get AI analysis (including name generation in single call)
      const aiAnalysis = await this.getAIAnalysis(workflowSummary, workflow);

      // Use AI-generated name, or fall back to simple generation (no additional API call)
      const workflowName = aiAnalysis.name || 
        this.generateSimpleName(workflow, { integrations, triggers }) ||
        workflow.name || 
        'Unnamed Workflow';

      return {
        id: workflow.id || this.generateId(workflow),
        name: workflowName,
        description: aiAnalysis.description || 'n8n workflow automation',
        category: aiAnalysis.category || 'Automation',
        tags: [...(aiAnalysis.tags || []), ...this.generateTechnicalTags(workflow)],
        complexity,
        nodeCount: workflow.nodes?.length || 0,
        nodes,
        dependencies,
        triggers,
        actions,
        integrations,
        estimatedRuntime,
        useCase: aiAnalysis.useCase || 'General automation workflow',
        aiGenerated: true,
        lastAnalyzed: new Date().toISOString(),
        filePath,
        // Enhanced details
        inputRequirements: aiAnalysis.inputRequirements || [],
        expectedOutputs: aiAnalysis.expectedOutputs || [],
        dataFlow: aiAnalysis.dataFlow || 'Sequential node execution',
        businessLogic: aiAnalysis.businessLogic || 'Standard workflow logic',
        errorHandling: aiAnalysis.errorHandling || 'Basic error handling',
        dataTransformations: WorkflowParser.extractDataTransformations(workflow) || [],
        webhookUrls: WorkflowParser.extractWebhookUrls(workflow) || [],
        schedules: WorkflowParser.extractSchedules(workflow) || [],
        conditionalLogic: WorkflowParser.extractConditionalLogic(workflow) || [],
        loopsAndIterations: WorkflowParser.extractLoopsAndIterations(workflow) || [],
        // Store the original workflow data
        workflowData: workflow
      };
    } catch (error) {
      console.error('AI analysis failed, falling back to basic analysis:', error);
      return await this.createBasicAnalysis(workflow, filePath);
    }
  }

  private async getAIAnalysis(workflowSummary: string, workflow?: N8nWorkflow): Promise<{
    name: string;
    description: string;
    category: string;
    tags: string[];
    useCase: string;
    inputRequirements: string[];
    expectedOutputs: string[];
    dataFlow: string;
    businessLogic: string;
    errorHandling: string;
  }> {
    const prompt = `Analyze this n8n workflow and provide a detailed JSON response with the following structure:
{
  "name": "A concise, descriptive workflow name (2-4 words max, unique and specific)",
  "description": "A detailed 2-3 sentence description of what this workflow does, including key functionality",
  "category": "One of: Automation, Data Processing, Integration, Monitoring, Communication, Marketing, Development, Business Process, E-commerce, Content Management",
  "tags": ["array", "of", "relevant", "tags", "max 8"],
  "useCase": "A detailed explanation of when/why someone would use this workflow, including specific scenarios",
  "inputRequirements": ["Array of required inputs", "data formats", "parameters", "credentials needed"],
  "expectedOutputs": ["Array of what this workflow produces", "output formats", "data structures", "side effects"],
  "dataFlow": "A clear description of how data flows through the workflow from input to output",
  "businessLogic": "Explanation of the business rules, logic, and decision-making processes in the workflow", 
  "errorHandling": "Description of how errors are handled, retries, fallbacks, and failure scenarios"
}

Workflow Summary:
${workflowSummary}

Focus on practical business value and keep responses concise. Use lowercase tags with hyphens for multi-word tags.`;

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are an expert n8n workflow analyst. Provide accurate, concise analysis in valid JSON format only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 500,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error('No content in AI response');
    }

    try {
      return JSON.parse(content);
    } catch (parseError) {
      // Fallback parsing if JSON is malformed
      return this.parseAIResponseFallback(content);
    }
  }

  private createWorkflowSummary(workflow: N8nWorkflow, metadata: any): string {
    const { nodes, triggers, actions, integrations } = metadata;
    
    return `
Workflow Name: ${workflow.name || 'Untitled'}
Node Count: ${workflow.nodes.length}
Triggers: ${triggers.join(', ') || 'None'}
Actions: ${actions.slice(0, 5).join(', ')}${actions.length > 5 ? '...' : ''}
Integrations: ${integrations.join(', ') || 'None'}
Key Nodes: ${nodes.slice(0, 8).map((n: any) => `${n.type}(${n.count})`).join(', ')}

Node Details:
${workflow.nodes.slice(0, 10).map(node => 
  `- ${node.type}: ${node.name}${node.notes ? ` (${node.notes.substring(0, 100)})` : ''}`
).join('\n')}
${workflow.nodes.length > 10 ? `... and ${workflow.nodes.length - 10} more nodes` : ''}
`.trim();
  }

  private parseAIResponseFallback(content: string): {
    name: string;
    description: string;
    category: string;
    tags: string[];
    useCase: string;
    inputRequirements: string[];
    expectedOutputs: string[];
    dataFlow: string;
    businessLogic: string;
    errorHandling: string;
  } {
    // Try to extract JSON from response even if it's not perfectly formatted
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch {
        // Continue to manual parsing
      }
    }

    // Manual parsing fallback
    return {
      name: this.extractValue(content, 'name') || 'Workflow Automation',
      description: this.extractValue(content, 'description') || 'n8n workflow automation',
      category: this.extractValue(content, 'category') || 'Automation',
      tags: this.extractArray(content, 'tags') || ['automation'],
      useCase: this.extractValue(content, 'useCase') || 'General automation purposes',
      inputRequirements: this.extractArray(content, 'inputRequirements') || ['External trigger or data source'],
      expectedOutputs: this.extractArray(content, 'expectedOutputs') || ['Automated action or data processing'],
      dataFlow: this.extractValue(content, 'dataFlow') || 'Data flows through connected nodes sequentially',
      businessLogic: this.extractValue(content, 'businessLogic') || 'Executes predefined automation logic',
      errorHandling: this.extractValue(content, 'errorHandling') || 'Basic error handling with workflow termination'
    };
  }

  private extractValue(content: string, key: string): string | null {
    const regex = new RegExp(`"${key}"\\s*:\\s*"([^"]*)"`, 'i');
    const match = content.match(regex);
    return match ? match[1] : null;
  }

  private extractArray(content: string, key: string): string[] | null {
    const regex = new RegExp(`"${key}"\\s*:\\s*\\[([^\\]]*)\\]`, 'i');
    const match = content.match(regex);
    if (match) {
      return match[1]
        .split(',')
        .map(item => item.replace(/"/g, '').trim())
        .filter(item => item.length > 0);
    }
    return null;
  }

  private generateTechnicalTags(workflow: N8nWorkflow): string[] {
    const tags: string[] = [];
    
    try {
      // Add complexity tag
      const complexity = WorkflowParser.calculateComplexity(workflow);
      if (complexity) {
        tags.push(complexity.toLowerCase());
      }

      // Add node count category
      const nodeCount = workflow.nodes?.length || 0;
      if (nodeCount <= 5) tags.push('simple-workflow');
      else if (nodeCount <= 15) tags.push('medium-workflow');
      else tags.push('complex-workflow');

      // Add trigger type tags
      const triggers = WorkflowParser.extractTriggers(workflow);
      if (triggers && Array.isArray(triggers)) {
        if (triggers.some(t => t && typeof t === 'string' && t.toLowerCase().includes('webhook'))) tags.push('webhook');
        if (triggers.some(t => t && typeof t === 'string' && t.toLowerCase().includes('cron'))) tags.push('scheduled');
        if (triggers.some(t => t && typeof t === 'string' && t.toLowerCase().includes('manual'))) tags.push('manual-trigger');
      }

      // Add integration tags
      const integrations = WorkflowParser.extractIntegrations(workflow);
      if (integrations && Array.isArray(integrations)) {
        integrations.slice(0, 3).forEach(integration => {
          if (integration && typeof integration === 'string') {
            tags.push(integration.toLowerCase().replace(/\s+/g, '-'));
          }
        });
      }
    } catch (error) {
      console.warn('Error generating technical tags:', error);
      tags.push('basic-workflow');
    }

    return tags.filter(tag => tag && tag.length > 0);
  }

  private async createBasicAnalysis(workflow: N8nWorkflow, filePath?: string): Promise<WorkflowAnalysis> {
    const nodes = WorkflowParser.extractNodes(workflow);
    const dependencies = WorkflowParser.extractDependencies(workflow);
    const triggers = WorkflowParser.extractTriggers(workflow);
    const actions = WorkflowParser.extractActions(workflow);
    const integrations = WorkflowParser.extractIntegrations(workflow);
    const complexity = WorkflowParser.calculateComplexity(workflow);
    const estimatedRuntime = WorkflowParser.estimateRuntime(workflow);

    // Generate basic description and category
    const hasWebhook = triggers.some(t => t.toLowerCase().includes('webhook'));
    const hasSchedule = triggers.some(t => t.toLowerCase().includes('cron'));
    const primaryIntegration = integrations[0];

    let description = `n8n workflow with ${workflow.nodes.length} nodes`;
    let category = 'Automation';
    let useCase = 'General automation workflow';

    if (primaryIntegration) {
      description += ` integrating ${primaryIntegration}`;
      category = this.inferCategoryFromIntegration(primaryIntegration);
    }

    if (hasWebhook) {
      description += ' triggered by webhook';
      useCase = 'Responds to external events via webhook';
    } else if (hasSchedule) {
      description += ' running on schedule';
      useCase = 'Automated scheduled task execution';
    }

    // Generate simple name for fallback analysis (no AI call to keep it fast)
    const workflowName = this.generateSimpleName(workflow, { integrations, triggers });

    return {
      id: workflow.id || this.generateId(workflow),
      name: workflowName,
      description,
      category,
      tags: this.generateTechnicalTags(workflow),
      complexity,
      nodeCount: workflow.nodes.length,
      nodes,
      dependencies,
      triggers,
      actions,
      integrations,
      estimatedRuntime,
      useCase,
      aiGenerated: false,
      lastAnalyzed: new Date().toISOString(),
      filePath,
      // Enhanced details (basic fallback)
      inputRequirements: triggers.length > 0 ? [`${triggers[0]} trigger`] : ['Manual execution'],
      expectedOutputs: integrations.length > 0 ? [`Output to ${integrations[0]}`] : ['Processed data'],
      dataFlow: 'Sequential node execution based on workflow connections',
      businessLogic: 'Standard workflow automation logic',
      errorHandling: 'Default n8n error handling',
      dataTransformations: WorkflowParser.extractDataTransformations(workflow),
      webhookUrls: WorkflowParser.extractWebhookUrls(workflow),
      schedules: WorkflowParser.extractSchedules(workflow),
      conditionalLogic: WorkflowParser.extractConditionalLogic(workflow),
      loopsAndIterations: WorkflowParser.extractLoopsAndIterations(workflow),
      // Store the original workflow data
      workflowData: workflow
    };
  }

  private inferCategoryFromIntegration(integration: string): string {
    const categoryMap: Record<string, string> = {
      'slack': 'Communication',
      'discord': 'Communication',
      'telegram': 'Communication',
      'gmail': 'Communication',
      'sheets': 'Data Processing',
      'airtable': 'Data Processing',
      'notion': 'Content Management',
      'github': 'Development',
      'gitlab': 'Development',
      'stripe': 'E-commerce',
      'shopify': 'E-commerce',
      'hubspot': 'Marketing',
      'salesforce': 'Business Process'
    };

    return categoryMap[integration.toLowerCase()] || 'Integration';
  }

  private generateSimpleName(workflow: N8nWorkflow, metadata: { integrations: string[], triggers: string[] }): string {
    // Return existing name if it's meaningful (not empty, null, or generic)
    const existingName = workflow.name?.trim();
    if (existingName && 
        existingName !== 'My Workflow' && 
        existingName !== 'Untitled Workflow' && 
        existingName !== 'New Workflow' &&
        existingName.length > 2) {
      return existingName;
    }

    const { integrations, triggers } = metadata;
    const workflowId = this.generateId(workflow).substring(0, 4);

    // Generate name based on integrations or triggers
    if (integrations.length > 0) {
      return `${integrations[0]} Workflow ${workflowId}`;
    } else if (triggers.length > 0) {
      return `${triggers[0]} Automation ${workflowId}`;
    } else {
      return `Custom Workflow ${workflowId}`;
    }
  }


  private generateId(workflow?: N8nWorkflow): string {
    if (workflow) {
      // Generate deterministic ID based on workflow content to prevent duplicates
      const content = JSON.stringify({
        name: workflow.name,
        nodes: workflow.nodes?.map(n => ({ type: n.type, position: n.position })) || [],
        connections: workflow.connections || {}
      });
      // Simple hash function to create deterministic ID
      let hash = 0;
      for (let i = 0; i < content.length; i++) {
        const char = content.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
      }
      const id = Math.abs(hash).toString(36);
      console.log('Generated deterministic ID for workflow:', workflow.name, '-> ID:', id);
      return id;
    }
    // Fallback to random ID if no workflow provided
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }

  // Batch analysis for multiple workflows
  async analyzeWorkflows(
    workflows: Array<{ workflow: N8nWorkflow; filePath?: string }>,
    onProgress?: (completed: number, total: number) => void
  ): Promise<WorkflowAnalysis[]> {
    const results: WorkflowAnalysis[] = [];
    
    for (let i = 0; i < workflows.length; i++) {
      try {
        const { workflow, filePath } = workflows[i];
        const analysis = await this.analyzeWorkflow(workflow, filePath);
        results.push(analysis);
        
        if (onProgress) {
          onProgress(i + 1, workflows.length);
        }
        
        // Add small delay to respect API rate limits
        if (i < workflows.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (error) {
        console.error(`Failed to analyze workflow ${i}:`, error);
        // Continue with next workflow
      }
    }
    
    return results;
  }
}