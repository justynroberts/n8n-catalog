import Database from 'better-sqlite3';
import path from 'path';
import { WorkflowAnalysis } from '@/types/workflow';

const DB_PATH = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'catalog.db');

export class SQLiteDatabase {
  private static instance: SQLiteDatabase;
  private db: Database.Database;

  private constructor() {
    try {
      // Ensure data directory exists
      const fs = require('fs');
      const dataDir = path.dirname(DB_PATH);
      console.log(`Database path: ${DB_PATH}`);
      console.log(`Data directory: ${dataDir}`);
      
      if (!fs.existsSync(dataDir)) {
        console.log(`Creating data directory: ${dataDir}`);
        fs.mkdirSync(dataDir, { recursive: true });
      } else {
        console.log(`Data directory already exists: ${dataDir}`);
      }

      console.log(`Initializing SQLite database at: ${DB_PATH}`);
      this.db = new Database(DB_PATH);
      this.db.pragma('journal_mode = WAL'); // Better performance
      this.initializeTables();
      this.initializeSampleData();
      console.log('SQLite database initialized successfully');
    } catch (error) {
      console.error('Failed to initialize database:', error);
      throw error;
    }
  }

  static getInstance(): SQLiteDatabase {
    if (!SQLiteDatabase.instance) {
      SQLiteDatabase.instance = new SQLiteDatabase();
    }
    return SQLiteDatabase.instance;
  }

  private initializeTables(): void {
    // Workflows table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS workflows (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        category TEXT,
        tags TEXT,
        import_tags TEXT,
        complexity TEXT,
        node_count INTEGER,
        nodes TEXT,
        dependencies TEXT,
        triggers TEXT,
        actions TEXT,
        integrations TEXT,
        estimated_runtime TEXT,
        use_case TEXT,
        ai_generated BOOLEAN,
        last_analyzed DATETIME,
        file_path TEXT,
        input_requirements TEXT,
        expected_outputs TEXT,
        data_flow TEXT,
        business_logic TEXT,
        error_handling TEXT,
        data_transformations TEXT,
        webhook_urls TEXT,
        schedules TEXT,
        conditional_logic TEXT,
        loops_and_iterations TEXT,
        workflow_data TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Add import_tags column if it doesn't exist (migration)
    try {
      this.db.exec(`ALTER TABLE workflows ADD COLUMN import_tags TEXT`);
    } catch (e) {
      // Column might already exist, ignore error
    }

    // Add workflow_data column if it doesn't exist (migration)
    try {
      this.db.exec(`ALTER TABLE workflows ADD COLUMN workflow_data TEXT`);
    } catch (e) {
      // Column might already exist, ignore error
    }

    // Import queue table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS import_queue (
        id TEXT PRIMARY KEY,
        file_name TEXT NOT NULL,
        file_path TEXT,
        file_content TEXT,
        file_size INTEGER,
        status TEXT DEFAULT 'pending',
        error_message TEXT,
        workflow_id TEXT,
        session_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        processed_at DATETIME,
        FOREIGN KEY (workflow_id) REFERENCES workflows(id)
      )
    `);

    // Import sessions table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS import_sessions (
        id TEXT PRIMARY KEY,
        total_files INTEGER,
        processed_files INTEGER,
        failed_files INTEGER,
        skipped_files INTEGER,
        status TEXT DEFAULT 'active',
        api_key TEXT,
        import_tag TEXT DEFAULT 'internetsourced',
        started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME,
        last_update DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Add import_tag column if it doesn't exist (migration)
    try {
      this.db.exec(`ALTER TABLE import_sessions ADD COLUMN import_tag TEXT DEFAULT 'internetsourced'`);
    } catch (e) {
      // Column might already exist, ignore error
    }

    // Create comprehensive indexes for performance optimization
    this.db.exec(`
      -- Workflows table indexes
      CREATE INDEX IF NOT EXISTS idx_workflows_category ON workflows(category);
      CREATE INDEX IF NOT EXISTS idx_workflows_complexity ON workflows(complexity);
      CREATE INDEX IF NOT EXISTS idx_workflows_updated ON workflows(updated_at DESC);
      CREATE INDEX IF NOT EXISTS idx_workflows_name ON workflows(name);
      CREATE INDEX IF NOT EXISTS idx_workflows_node_count ON workflows(node_count);
      CREATE INDEX IF NOT EXISTS idx_workflows_last_analyzed ON workflows(last_analyzed DESC);
      CREATE INDEX IF NOT EXISTS idx_workflows_ai_generated ON workflows(ai_generated);
      CREATE INDEX IF NOT EXISTS idx_workflows_category_complexity ON workflows(category, complexity);
      CREATE INDEX IF NOT EXISTS idx_workflows_category_updated ON workflows(category, updated_at DESC);
      
      -- Full-text search indexes for workflows
      CREATE INDEX IF NOT EXISTS idx_workflows_name_lower ON workflows(LOWER(name));
      CREATE INDEX IF NOT EXISTS idx_workflows_description_lower ON workflows(LOWER(description));
      
      -- Import queue indexes
      CREATE INDEX IF NOT EXISTS idx_import_queue_status ON import_queue(status);
      CREATE INDEX IF NOT EXISTS idx_import_queue_session ON import_queue(session_id);
      CREATE INDEX IF NOT EXISTS idx_import_queue_status_session ON import_queue(status, session_id);
      CREATE INDEX IF NOT EXISTS idx_import_queue_created ON import_queue(created_at DESC);
      
      -- Import sessions indexes
      CREATE INDEX IF NOT EXISTS idx_import_sessions_status ON import_sessions(status);
      CREATE INDEX IF NOT EXISTS idx_import_sessions_started ON import_sessions(started_at DESC);
      CREATE INDEX IF NOT EXISTS idx_import_sessions_last_update ON import_sessions(last_update DESC);
    `);
  }

  private initializeSampleData(): void {
    try {
      // Check if we already have workflows
      const count = this.getWorkflowCount();
      if (count > 0) {
        console.log(`Database already has ${count} workflows, skipping sample data initialization`);
        return;
      }

      console.log('Initializing sample workflow data...');
      
      const sampleWorkflows: WorkflowAnalysis[] = [
        {
          id: 'sample-webhook-to-slack',
          name: 'Webhook to Slack Notification',
          description: 'Receives webhook data and sends formatted notifications to Slack',
          category: 'notifications',
          tags: ['webhook', 'slack', 'notifications'],
          complexity: 'Simple' as const,
          nodeCount: 3,
          nodes: [
            { type: 'n8n-nodes-base.webhook', count: 1, name: 'Webhook' },
            { type: 'n8n-nodes-base.function', count: 1, name: 'Format Message' },
            { type: 'n8n-nodes-base.slack', count: 1, name: 'Slack' }
          ],
          dependencies: ['Slack'],
          triggers: ['webhook'],
          actions: ['sendMessage'],
          integrations: ['Slack'],
          estimatedRuntime: '1-2 minutes',
          useCase: 'Receive alerts or notifications and forward them to Slack channels',
          aiGenerated: false,
          lastAnalyzed: new Date().toISOString(),
          inputRequirements: ['Webhook URL configuration'],
          expectedOutputs: ['Slack message posted'],
          dataFlow: 'Webhook → Data Processing → Slack Notification',
          businessLogic: 'Simple notification forwarding system',
          errorHandling: 'Basic error handling with retry logic'
        },
        {
          id: 'sample-google-sheets-sync',
          name: 'Google Sheets Data Sync',
          description: 'Syncs data between Google Sheets and external APIs',
          category: 'data-sync',
          tags: ['google-sheets', 'api', 'sync'],
          complexity: 'Medium' as const,
          nodeCount: 5,
          nodes: [
            { type: 'n8n-nodes-base.cron', count: 1, name: 'Schedule' },
            { type: 'n8n-nodes-base.googleSheets', count: 2, name: 'Google Sheets' },
            { type: 'n8n-nodes-base.httpRequest', count: 1, name: 'HTTP Request' },
            { type: 'n8n-nodes-base.function', count: 1, name: 'Data Transform' }
          ],
          dependencies: ['Google Sheets API'],
          triggers: ['schedule'],
          actions: ['readSheets', 'updateSheets', 'httpRequest'],
          integrations: ['Google Sheets', 'HTTP API'],
          estimatedRuntime: '5-10 minutes',
          useCase: 'Automated data synchronization between spreadsheets and external systems',
          aiGenerated: false,
          lastAnalyzed: new Date().toISOString(),
          inputRequirements: ['Google Sheets credentials', 'API endpoint'],
          expectedOutputs: ['Updated spreadsheet data'],
          dataFlow: 'Schedule → Read Sheets → Transform → API Call → Update Sheets',
          businessLogic: 'Bidirectional data sync with transformation',
          errorHandling: 'Retry mechanism and error logging'
        },
        {
          id: 'sample-email-processing',
          name: 'Email Processing Pipeline',
          description: 'Advanced email processing with attachments and conditional routing',
          category: 'email',
          tags: ['email', 'attachments', 'processing'],
          complexity: 'Complex' as const,
          nodeCount: 8,
          nodes: [
            { type: 'n8n-nodes-base.emailReadImap', count: 1, name: 'Email Trigger' },
            { type: 'n8n-nodes-base.if', count: 2, name: 'Conditions' },
            { type: 'n8n-nodes-base.function', count: 2, name: 'Processing' },
            { type: 'n8n-nodes-base.httpRequest', count: 1, name: 'API Call' },
            { type: 'n8n-nodes-base.googleDrive', count: 1, name: 'File Storage' },
            { type: 'n8n-nodes-base.slack', count: 1, name: 'Notification' }
          ],
          dependencies: ['Email Server', 'Google Drive', 'Slack'],
          triggers: ['emailReceived'],
          actions: ['processEmail', 'saveAttachment', 'sendNotification'],
          integrations: ['IMAP Email', 'Google Drive', 'Slack'],
          estimatedRuntime: '3-7 minutes',
          useCase: 'Automated email processing with attachment handling and smart routing',
          aiGenerated: false,
          lastAnalyzed: new Date().toISOString(),
          inputRequirements: ['IMAP credentials', 'Google Drive API', 'Slack webhook'],
          expectedOutputs: ['Processed emails', 'Saved attachments', 'Notifications'],
          dataFlow: 'Email → Conditional Logic → Processing → Storage → Notification',
          businessLogic: 'Complex email routing based on content and attachments',
          errorHandling: 'Comprehensive error handling with fallback options'
        }
      ];

      // Add some additional variety
      for (let i = 4; i <= 20; i++) {
        const categories = ['automation', 'data-processing', 'integrations', 'monitoring'];
        const complexities: ('Simple' | 'Medium' | 'Complex')[] = ['Simple', 'Medium', 'Complex'];
        const randomCategory = categories[Math.floor(Math.random() * categories.length)];
        const randomComplexity = complexities[Math.floor(Math.random() * complexities.length)];
        
        sampleWorkflows.push({
          id: `sample-workflow-${i}`,
          name: `Sample ${randomCategory.charAt(0).toUpperCase() + randomCategory.slice(1)} Workflow ${i}`,
          description: `A sample ${randomComplexity.toLowerCase()} workflow for ${randomCategory}`,
          category: randomCategory,
          tags: [randomCategory, randomComplexity.toLowerCase()],
          complexity: randomComplexity,
          nodeCount: randomComplexity === 'Simple' ? 2 : randomComplexity === 'Medium' ? 4 : 6,
          nodes: [
            { type: 'n8n-nodes-base.webhook', count: 1, name: 'Trigger' },
            { type: 'n8n-nodes-base.function', count: 1, name: 'Process' }
          ],
          dependencies: [],
          triggers: ['webhook'],
          actions: ['process'],
          integrations: ['HTTP'],
          estimatedRuntime: '1-5 minutes',
          useCase: `Sample ${randomCategory} use case`,
          aiGenerated: false,
          lastAnalyzed: new Date().toISOString()
        });
      }

      // Save all sample workflows
      this.saveWorkflows(sampleWorkflows, 'sample');
      console.log(`Initialized ${sampleWorkflows.length} sample workflows`);
      
    } catch (error) {
      console.error('Failed to initialize sample data:', error);
      // Don't throw - sample data is optional
    }
  }

  // Workflow operations
  saveWorkflow(workflow: WorkflowAnalysis, importTag?: string): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO workflows (
        id, name, description, category, tags, import_tags, complexity, node_count,
        nodes, dependencies, triggers, actions, integrations,
        estimated_runtime, use_case, ai_generated, last_analyzed, file_path,
        input_requirements, expected_outputs, data_flow, business_logic,
        error_handling, data_transformations, webhook_urls, schedules,
        conditional_logic, loops_and_iterations, workflow_data, updated_at
      ) VALUES (
        @id, @name, @description, @category, @tags, @importTags, @complexity, @nodeCount,
        @nodes, @dependencies, @triggers, @actions, @integrations,
        @estimatedRuntime, @useCase, @aiGenerated, @lastAnalyzed, @filePath,
        @inputRequirements, @expectedOutputs, @dataFlow, @businessLogic,
        @errorHandling, @dataTransformations, @webhookUrls, @schedules,
        @conditionalLogic, @loopsAndIterations, @workflowData, CURRENT_TIMESTAMP
      )
    `);

    stmt.run({
      ...workflow,
      tags: JSON.stringify(workflow.tags),
      importTags: importTag || 'internetsourced',
      nodes: JSON.stringify(workflow.nodes),
      dependencies: JSON.stringify(workflow.dependencies),
      triggers: JSON.stringify(workflow.triggers),
      actions: JSON.stringify(workflow.actions),
      integrations: JSON.stringify(workflow.integrations),
      aiGenerated: workflow.aiGenerated ? 1 : 0,
      inputRequirements: JSON.stringify(workflow.inputRequirements || []),
      expectedOutputs: JSON.stringify(workflow.expectedOutputs || []),
      dataTransformations: JSON.stringify(workflow.dataTransformations || []),
      webhookUrls: JSON.stringify(workflow.webhookUrls || []),
      schedules: JSON.stringify(workflow.schedules || []),
      conditionalLogic: JSON.stringify(workflow.conditionalLogic || []),
      loopsAndIterations: JSON.stringify(workflow.loopsAndIterations || []),
      workflowData: workflow.workflowData ? JSON.stringify(workflow.workflowData) : null
    });
  }

  saveWorkflows(workflows: WorkflowAnalysis[], importTag?: string): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO workflows (
        id, name, description, category, tags, import_tags, complexity, node_count,
        nodes, dependencies, triggers, actions, integrations,
        estimated_runtime, use_case, ai_generated, last_analyzed, file_path,
        input_requirements, expected_outputs, data_flow, business_logic,
        error_handling, data_transformations, webhook_urls, schedules,
        conditional_logic, loops_and_iterations, workflow_data, updated_at
      ) VALUES (
        @id, @name, @description, @category, @tags, @importTags, @complexity, @nodeCount,
        @nodes, @dependencies, @triggers, @actions, @integrations,
        @estimatedRuntime, @useCase, @aiGenerated, @lastAnalyzed, @filePath,
        @inputRequirements, @expectedOutputs, @dataFlow, @businessLogic,
        @errorHandling, @dataTransformations, @webhookUrls, @schedules,
        @conditionalLogic, @loopsAndIterations, @workflowData, CURRENT_TIMESTAMP
      )
    `);

    const transaction = this.db.transaction((workflows: WorkflowAnalysis[]) => {
      for (const workflow of workflows) {
        stmt.run({
          ...workflow,
          tags: JSON.stringify(workflow.tags),
          importTags: importTag || 'internetsourced',
          nodes: JSON.stringify(workflow.nodes),
          dependencies: JSON.stringify(workflow.dependencies),
          triggers: JSON.stringify(workflow.triggers),
          actions: JSON.stringify(workflow.actions),
          integrations: JSON.stringify(workflow.integrations),
          aiGenerated: workflow.aiGenerated ? 1 : 0,
          inputRequirements: JSON.stringify(workflow.inputRequirements || []),
          expectedOutputs: JSON.stringify(workflow.expectedOutputs || []),
          dataTransformations: JSON.stringify(workflow.dataTransformations || []),
          webhookUrls: JSON.stringify(workflow.webhookUrls || []),
          schedules: JSON.stringify(workflow.schedules || []),
          conditionalLogic: JSON.stringify(workflow.conditionalLogic || []),
          loopsAndIterations: JSON.stringify(workflow.loopsAndIterations || [])
        });
      }
    });

    transaction(workflows);
  }

  getAllWorkflows(limit?: number, offset?: number): WorkflowAnalysis[] {
    // Add pagination support for better performance with large datasets
    let query = 'SELECT * FROM workflows ORDER BY updated_at DESC';
    if (limit) {
      query += ` LIMIT ${limit}`;
      if (offset) {
        query += ` OFFSET ${offset}`;
      }
    }
    
    const stmt = this.db.prepare(query);
    const rows = stmt.all();
    
    return rows.map(row => this.parseWorkflowRow(row));
  }

  getWorkflowCount(): number {
    const stmt = this.db.prepare('SELECT COUNT(*) as count FROM workflows');
    const result = stmt.get() as { count: number };
    return result.count;
  }

  getWorkflowById(id: string): WorkflowAnalysis | null {
    const stmt = this.db.prepare('SELECT * FROM workflows WHERE id = ?');
    const row = stmt.get(id);
    
    return row ? this.parseWorkflowRow(row) : null;
  }

  searchWorkflows(query: string): WorkflowAnalysis[] {
    // Optimize search with case-insensitive LIKE and proper indexing
    const stmt = this.db.prepare(`
      SELECT * FROM workflows 
      WHERE LOWER(name) LIKE LOWER(@query) 
      OR LOWER(description) LIKE LOWER(@query) 
      OR LOWER(category) LIKE LOWER(@query) 
      OR LOWER(tags) LIKE LOWER(@query)
      OR LOWER(integrations) LIKE LOWER(@query)
      OR LOWER(use_case) LIKE LOWER(@query)
      ORDER BY 
        CASE 
          WHEN LOWER(name) LIKE LOWER(@exactQuery) THEN 1
          WHEN LOWER(name) LIKE LOWER(@query) THEN 2
          WHEN LOWER(category) LIKE LOWER(@query) THEN 3
          ELSE 4
        END,
        updated_at DESC
      LIMIT 1000
    `);
    
    const exactQuery = query;
    const likeQuery = `%${query}%`;
    const rows = stmt.all({ query: likeQuery, exactQuery });
    return rows.map(row => this.parseWorkflowRow(row));
  }

  deleteWorkflow(id: string): void {
    const stmt = this.db.prepare('DELETE FROM workflows WHERE id = ?');
    stmt.run(id);
  }

  clearAllWorkflows(): void {
    // Delete in correct order due to foreign key constraints
    // First delete child tables that reference workflows
    this.db.exec('DELETE FROM import_queue');
    this.db.exec('DELETE FROM import_sessions');
    // Then delete the parent table
    this.db.exec('DELETE FROM workflows');
  }

  deleteWorkflowsByTag(tag: string): number {
    // First delete related records in import_queue for workflows with this tag
    const deleteQueueStmt = this.db.prepare(`
      DELETE FROM import_queue 
      WHERE workflow_id IN (
        SELECT id FROM workflows WHERE import_tags = ?
      )
    `);
    deleteQueueStmt.run(tag);

    // Then delete the workflows themselves
    const stmt = this.db.prepare('DELETE FROM workflows WHERE import_tags = ?');
    const result = stmt.run(tag);
    return result.changes;
  }

  getWorkflowTags(): { tag: string; count: number }[] {
    const stmt = this.db.prepare(`
      SELECT import_tags as tag, COUNT(*) as count 
      FROM workflows 
      WHERE import_tags IS NOT NULL 
      GROUP BY import_tags 
      ORDER BY count DESC
    `);
    return stmt.all() as { tag: string; count: number }[];
  }

  deleteDuplicateWorkflows(): number {
    // First identify duplicate workflow IDs that will be deleted
    const duplicateIds = this.db.prepare(`
      SELECT id FROM workflows 
      WHERE id NOT IN (
        SELECT MIN(id) 
        FROM workflows 
        GROUP BY name
      )
    `).all() as { id: string }[];

    // Delete related records in import_queue for duplicate workflows
    if (duplicateIds.length > 0) {
      const idsToDelete = duplicateIds.map(row => row.id);
      const placeholders = idsToDelete.map(() => '?').join(',');
      const deleteQueueStmt = this.db.prepare(`
        DELETE FROM import_queue 
        WHERE workflow_id IN (${placeholders})
      `);
      deleteQueueStmt.run(...idsToDelete);
    }

    // Then delete the duplicate workflows themselves
    const stmt = this.db.prepare(`
      DELETE FROM workflows 
      WHERE id NOT IN (
        SELECT MIN(id) 
        FROM workflows 
        GROUP BY name
      )
    `);
    const result = stmt.run();
    return result.changes;
  }

  isWorkflowCached(name: string, filePath?: string, workflowId?: string): WorkflowAnalysis | null {
    // Use workflow ID for duplicate detection if provided (more reliable than name)
    if (workflowId) {
      const stmt = this.db.prepare('SELECT * FROM workflows WHERE id = ?');
      const row = stmt.get(workflowId);
      
      if (row) {
        return this.parseWorkflowRow(row);
      }
    }
    
    // Fallback to name-based detection for backward compatibility
    const stmt = this.db.prepare('SELECT * FROM workflows WHERE name = ?');
    const row = stmt.get(name);
    
    if (!row) return null;
    
    const workflow = this.parseWorkflowRow(row);
    
    // Check if it's the same file path if provided
    if (filePath && workflow.filePath !== filePath) {
      return null;
    }
    
    return workflow;
  }

  // Import queue operations
  createImportSession(totalFiles: number, apiKey: string, importTag: string = 'internetsourced'): string {
    const id = Math.random().toString(36).substring(2, 15);
    const stmt = this.db.prepare(`
      INSERT INTO import_sessions (id, total_files, processed_files, failed_files, skipped_files, api_key, import_tag)
      VALUES (?, ?, 0, 0, 0, ?, ?)
    `);
    
    stmt.run(id, totalFiles, apiKey, importTag);
    return id;
  }

  addToImportQueue(sessionId: string, fileName: string, filePath: string, fileContent: string, fileSize: number): string {
    const id = Math.random().toString(36).substring(2, 15);
    const stmt = this.db.prepare(`
      INSERT INTO import_queue (id, session_id, file_name, file_path, file_content, file_size)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(id, sessionId, fileName, filePath, fileContent, fileSize);
    return id;
  }

  getNextPendingImport(sessionId: string): any | null {
    const stmt = this.db.prepare(`
      SELECT * FROM import_queue 
      WHERE session_id = ? AND status = 'pending' 
      ORDER BY created_at ASC 
      LIMIT 1
    `);
    
    return stmt.get(sessionId);
  }

  updateImportStatus(id: string, status: string, workflowId?: string, errorMessage?: string): void {
    const stmt = this.db.prepare(`
      UPDATE import_queue 
      SET status = ?, workflow_id = ?, error_message = ?, processed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    
    stmt.run(status, workflowId || null, errorMessage || null, id);
  }

  updateImportSession(sessionId: string, updates: { processed_files?: number; failed_files?: number; skipped_files?: number; status?: string }): void {
    const setParts = [];
    const values = [];

    if (updates.processed_files !== undefined) {
      setParts.push('processed_files = ?');
      values.push(updates.processed_files);
    }
    if (updates.failed_files !== undefined) {
      setParts.push('failed_files = ?');
      values.push(updates.failed_files);
    }
    if (updates.skipped_files !== undefined) {
      setParts.push('skipped_files = ?');
      values.push(updates.skipped_files);
    }
    if (updates.status !== undefined) {
      setParts.push('status = ?');
      values.push(updates.status);
    }

    setParts.push('last_update = CURRENT_TIMESTAMP');
    values.push(sessionId);

    const stmt = this.db.prepare(`
      UPDATE import_sessions 
      SET ${setParts.join(', ')}
      WHERE id = ?
    `);
    
    stmt.run(...values);
  }

  getImportSession(sessionId: string): any | null {
    const stmt = this.db.prepare('SELECT * FROM import_sessions WHERE id = ?');
    return stmt.get(sessionId);
  }

  getActiveImportSession(): any | null {
    const stmt = this.db.prepare(`
      SELECT * FROM import_sessions 
      WHERE status = 'active' 
      ORDER BY started_at DESC 
      LIMIT 1
    `);
    
    return stmt.get();
  }

  getPendingImportsCount(sessionId: string): number {
    const stmt = this.db.prepare('SELECT COUNT(*) as count FROM import_queue WHERE session_id = ? AND status = ?');
    const result = stmt.get(sessionId, 'pending') as { count: number };
    return result.count;
  }

  getCurrentProcessingItem(sessionId: string): any | null {
    const stmt = this.db.prepare(`
      SELECT * FROM import_queue 
      WHERE session_id = ? AND status = 'processing' 
      ORDER BY created_at DESC 
      LIMIT 1
    `);
    
    return stmt.get(sessionId);
  }

  completeImportSession(sessionId: string): void {
    const stmt = this.db.prepare(`
      UPDATE import_sessions 
      SET status = 'completed', completed_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `);
    stmt.run(sessionId);
  }

  cancelImportSession(sessionId: string): void {
    const stmt = this.db.prepare(`
      UPDATE import_sessions 
      SET status = 'cancelled', completed_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `);
    stmt.run(sessionId);
    
    // Cancel all pending imports in this session
    const cancelQueueStmt = this.db.prepare(`
      UPDATE import_queue 
      SET status = 'cancelled' 
      WHERE session_id = ? AND status = 'pending'
    `);
    cancelQueueStmt.run(sessionId);
  }

  // Check if workflow name exists
  workflowNameExists(name: string): boolean {
    const stmt = this.db.prepare('SELECT COUNT(*) as count FROM workflows WHERE name = ?');
    const result = stmt.get(name) as { count: number };
    return result.count > 0;
  }

  // Get count of workflows with name pattern (for uniqueness)
  getWorkflowNameCount(namePattern: string): number {
    const stmt = this.db.prepare('SELECT COUNT(*) as count FROM workflows WHERE name LIKE ?');
    const result = stmt.get(`${namePattern}%`) as { count: number };
    return result.count;
  }

  // Fix duplicate workflow names
  fixDuplicateNames(): number {
    // Find all duplicate names
    const duplicateStmt = this.db.prepare(`
      SELECT name, COUNT(*) as count 
      FROM workflows 
      GROUP BY name 
      HAVING COUNT(*) > 1
    `);
    const duplicates = duplicateStmt.all() as { name: string; count: number }[];
    
    let fixedCount = 0;
    
    for (const duplicate of duplicates) {
      // Get all workflows with this duplicate name
      const workflowsStmt = this.db.prepare('SELECT id, name FROM workflows WHERE name = ? ORDER BY updated_at');
      const workflows = workflowsStmt.all(duplicate.name) as { id: string; name: string }[];
      
      // Keep the first one as-is, rename the rest
      for (let i = 1; i < workflows.length; i++) {
        const newName = `${duplicate.name} (${i})`;
        const updateStmt = this.db.prepare('UPDATE workflows SET name = ? WHERE id = ?');
        updateStmt.run(newName, workflows[i].id);
        console.log(`Renamed duplicate workflow: "${duplicate.name}" -> "${newName}" (ID: ${workflows[i].id})`);
        fixedCount++;
      }
    }
    
    return fixedCount;
  }

  // Helper methods
  private parseWorkflowRow(row: any): WorkflowAnalysis {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      category: row.category,
      tags: JSON.parse(row.tags),
      importTags: row.import_tags,
      complexity: row.complexity,
      nodeCount: row.node_count,
      nodes: JSON.parse(row.nodes),
      dependencies: JSON.parse(row.dependencies),
      triggers: JSON.parse(row.triggers),
      actions: JSON.parse(row.actions),
      integrations: JSON.parse(row.integrations),
      estimatedRuntime: row.estimated_runtime,
      useCase: row.use_case,
      aiGenerated: row.ai_generated === 1,
      lastAnalyzed: row.last_analyzed,
      filePath: row.file_path,
      inputRequirements: JSON.parse(row.input_requirements || '[]'),
      expectedOutputs: JSON.parse(row.expected_outputs || '[]'),
      dataFlow: row.data_flow,
      businessLogic: row.business_logic,
      errorHandling: row.error_handling,
      dataTransformations: JSON.parse(row.data_transformations || '[]'),
      webhookUrls: JSON.parse(row.webhook_urls || '[]'),
      schedules: JSON.parse(row.schedules || '[]'),
      conditionalLogic: JSON.parse(row.conditional_logic || '[]'),
      loopsAndIterations: JSON.parse(row.loops_and_iterations || '[]'),
      workflowData: row.workflow_data ? JSON.parse(row.workflow_data) : undefined
    };
  }

  // Export database to JSON
  exportDatabase(): string {
    try {
      // Export workflows - the main data
      const workflows = this.db.prepare('SELECT * FROM workflows ORDER BY updated_at DESC').all();
      
      // Export import sessions (optional, might not exist in all databases)
      let sessions: any[] = [];
      try {
        sessions = this.db.prepare('SELECT * FROM import_sessions ORDER BY started_at DESC').all();
      } catch (e) {
        console.log('Could not export sessions:', e);
      }
      
      // Don't export queue items as they're transient and can cause issues
      // const queue = this.db.prepare('SELECT * FROM import_queue').all();
      
      const exportData = {
        metadata: {
          exportDate: new Date().toISOString(),
          version: '1.0',
          totalWorkflows: workflows.length,
          totalSessions: sessions.length
        },
        workflows,
        sessions
        // queue is omitted as it's transient data
      };
      
      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      throw new Error(`Database export failed: ${error}`);
    }
  }

  // Import database from JSON
  importDatabase(jsonData: string, options: { 
    clearExisting?: boolean; 
    skipDuplicates?: boolean;
    preserveIds?: boolean;
  } = {}): { 
    imported: number; 
    skipped: number; 
    errors: string[]; 
  } {
    const { clearExisting = false, skipDuplicates = true, preserveIds = false } = options;
    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];
    
    try {
      const data = JSON.parse(jsonData);
      
      if (!data.workflows || !Array.isArray(data.workflows)) {
        throw new Error('Invalid import data format: missing workflows array');
      }
      
      // Start transaction
      const transaction = this.db.transaction(() => {
        // Clear existing data if requested
        if (clearExisting) {
          this.clearAllWorkflows();
        }
        
        // Import workflows
        for (const workflow of data.workflows) {
          try {
            // Check for duplicates by name if skipDuplicates is enabled
            if (skipDuplicates && this.workflowNameExists(workflow.name)) {
              skipped++;
              continue;
            }
            
            // Generate new ID if not preserving IDs
            if (!preserveIds) {
              workflow.id = crypto.randomUUID();
            }
            
            // Convert database row to WorkflowAnalysis object and save
            const workflowAnalysis: WorkflowAnalysis = {
              id: workflow.id,
              name: workflow.name,
              description: workflow.description || '',
              category: workflow.category || 'uncategorized',
              tags: typeof workflow.tags === 'string' ? JSON.parse(workflow.tags) : workflow.tags || [],
              nodes: typeof workflow.nodes === 'string' ? JSON.parse(workflow.nodes) : workflow.nodes || [],
              dependencies: [], // Will be analyzed later
              integrations: typeof workflow.integrations === 'string' ? JSON.parse(workflow.integrations) : workflow.integrations || [],
              triggers: typeof workflow.triggers === 'string' ? JSON.parse(workflow.triggers) : workflow.triggers || [],
              actions: typeof workflow.actions === 'string' ? JSON.parse(workflow.actions) : workflow.actions || [],
              nodeCount: workflow.node_count || 0,
              complexity: (workflow.complexity as 'Simple' | 'Medium' | 'Complex') || 'Simple',
              useCase: workflow.use_case || '',
              importTags: workflow.import_tags || undefined,
              lastAnalyzed: workflow.last_analyzed,
              filePath: workflow.file_path,
              estimatedRuntime: '1-5 minutes', // Default value
              aiGenerated: false, // Default value
              inputRequirements: typeof workflow.input_requirements === 'string' ? JSON.parse(workflow.input_requirements) : workflow.input_requirements || [],
              expectedOutputs: typeof workflow.expected_outputs === 'string' ? JSON.parse(workflow.expected_outputs) : workflow.expected_outputs || [],
              dataFlow: workflow.data_flow,
              businessLogic: workflow.business_logic,
              errorHandling: workflow.error_handling,
              dataTransformations: typeof workflow.data_transformations === 'string' ? JSON.parse(workflow.data_transformations) : workflow.data_transformations || [],
              webhookUrls: typeof workflow.webhook_urls === 'string' ? JSON.parse(workflow.webhook_urls) : workflow.webhook_urls || [],
              schedules: typeof workflow.schedules === 'string' ? JSON.parse(workflow.schedules) : workflow.schedules || [],
              conditionalLogic: typeof workflow.conditional_logic === 'string' ? JSON.parse(workflow.conditional_logic) : workflow.conditional_logic || [],
              loopsAndIterations: typeof workflow.loops_and_iterations === 'string' ? JSON.parse(workflow.loops_and_iterations) : workflow.loops_and_iterations || [],
              workflowData: workflow.workflow_data ? (typeof workflow.workflow_data === 'string' ? JSON.parse(workflow.workflow_data) : workflow.workflow_data) : undefined,
              upvotes: workflow.upvotes || 0,
              downvotes: workflow.downvotes || 0
            };
            
            this.saveWorkflow(workflowAnalysis);
            
            imported++;
          } catch (workflowError) {
            errors.push(`Failed to import workflow "${workflow.name}": ${workflowError}`);
          }
        }
        
        // Import sessions if provided (optional)
        if (data.sessions && Array.isArray(data.sessions) && preserveIds) {
          for (const session of data.sessions) {
            try {
              this.db.prepare(`
                INSERT OR REPLACE INTO import_sessions 
                (id, status, total_files, processed_files, failed_files, skipped_files, started_at, completed_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
              `).run(
                session.id,
                session.status,
                session.total_files,
                session.processed_files,
                session.failed_files,
                session.skipped_files,
                session.started_at,
                session.completed_at
              );
            } catch (sessionError) {
              errors.push(`Failed to import session "${session.id}": ${sessionError}`);
            }
          }
        }
      });
      
      // Execute transaction
      transaction();
      
      return { imported, skipped, errors };
    } catch (error) {
      throw new Error(`Database import failed: ${error}`);
    }
  }

  // Get database statistics for export/import info
  getDatabaseStats(): {
    totalWorkflows: number;
    totalSessions: number;
    totalQueueItems: number;
    dbSize: string;
    uniqueTags: number;
    categories: string[];
  } {
    const workflowCount = this.db.prepare('SELECT COUNT(*) as count FROM workflows').get() as { count: number };
    const sessionCount = this.db.prepare('SELECT COUNT(*) as count FROM import_sessions').get() as { count: number };
    const queueCount = this.db.prepare('SELECT COUNT(*) as count FROM import_queue').get() as { count: number };
    
    // Get unique tags
    const tagsQuery = this.db.prepare('SELECT DISTINCT import_tags FROM workflows WHERE import_tags IS NOT NULL').all() as { import_tags: string }[];
    const uniqueTags = tagsQuery.length;
    
    // Get unique categories
    const categoriesQuery = this.db.prepare('SELECT DISTINCT category FROM workflows ORDER BY category').all() as { category: string }[];
    const categories = categoriesQuery.map(row => row.category);
    
    // Get approximate database file size (simplified)
    const dbSize = 'N/A'; // Would need fs access to get actual file size
    
    return {
      totalWorkflows: workflowCount.count,
      totalSessions: sessionCount.count,
      totalQueueItems: queueCount.count,
      dbSize,
      uniqueTags,
      categories
    };
  }

  close(): void {
    this.db.close();
  }
}