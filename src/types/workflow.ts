export interface N8nNode {
  id: string;
  name: string;
  type: string;
  typeVersion?: number;
  position: [number, number];
  parameters?: Record<string, any>;
  credentials?: Record<string, string>;
  webhookId?: string;
  disabled?: boolean;
  notes?: string;
  onError?: 'stopWorkflow' | 'continueRegularOutput' | 'continueErrorOutput';
}

export interface N8nConnection {
  node: string;
  type: string;
  index: number;
}

export interface N8nWorkflow {
  id?: string;
  name: string;
  nodes: N8nNode[];
  connections: Record<string, Record<string, N8nConnection[][]>>;
  active?: boolean;
  settings?: Record<string, any>;
  staticData?: Record<string, any>;
  tags?: string[];
  triggerCount?: number;
  updatedAt?: string;
  createdAt?: string;
  versionId?: string;
  meta?: Record<string, any>;
}

export interface WorkflowAnalysis {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  importTags?: string;
  complexity: 'Simple' | 'Medium' | 'Complex';
  nodeCount: number;
  nodes: {
    type: string;
    count: number;
    name: string;
  }[];
  dependencies: string[];
  triggers: string[];
  actions: string[];
  integrations: string[];
  estimatedRuntime: string;
  useCase: string;
  aiGenerated: boolean;
  lastAnalyzed: string;
  filePath?: string;
  // Rating system
  rating?: number; // Net rating (upvotes - downvotes)
  upvotes?: number;
  downvotes?: number;
  userVote?: 'up' | 'down' | null; // Current user's vote
  // Enhanced details
  inputRequirements?: string[];
  expectedOutputs?: string[];
  dataFlow?: string;
  businessLogic?: string;
  errorHandling?: string;
  dataTransformations?: string[];
  webhookUrls?: string[];
  schedules?: string[];
  conditionalLogic?: string[];
  loopsAndIterations?: string[];
  // Raw workflow data
  workflowData?: N8nWorkflow; // The original n8n workflow JSON
}

export interface UploadedFile {
  name: string;
  path: string;
  size: number;
  type: string;
  content?: string;
  lastModified: number;
}