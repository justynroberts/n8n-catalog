import Database from 'better-sqlite3';
import path from 'path';
import { WorkflowAnalysis } from '@/types/workflow';

const DB_PATH = path.join(process.cwd(), 'catalog.db');

export class CatalogDatabase {
  private static instance: CatalogDatabase;
  private db: Database.Database;

  private constructor() {
    this.db = new Database(DB_PATH);
    this.db.pragma('journal_mode = WAL'); // Better performance
    this.initializeTables();
  }

  static getInstance(): CatalogDatabase {
    if (!CatalogDatabase.instance) {
      CatalogDatabase.instance = new CatalogDatabase();
    }
    return CatalogDatabase.instance;
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
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Import queue table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS import_queue (
        id TEXT PRIMARY KEY,
        file_name TEXT NOT NULL,
        file_path TEXT,
        file_content TEXT,
        status TEXT DEFAULT 'pending',
        error_message TEXT,
        workflow_id TEXT,
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
        status TEXT DEFAULT 'active',
        api_key TEXT,
        started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME
      )
    `);

    // Create indexes
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_workflows_category ON workflows(category);
      CREATE INDEX IF NOT EXISTS idx_workflows_complexity ON workflows(complexity);
      CREATE INDEX IF NOT EXISTS idx_import_queue_status ON import_queue(status);
      CREATE INDEX IF NOT EXISTS idx_import_sessions_status ON import_sessions(status);
    `);
  }

  // Workflow operations
  saveWorkflow(workflow: WorkflowAnalysis): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO workflows (
        id, name, description, category, tags, complexity, node_count,
        nodes, dependencies, triggers, actions, integrations,
        estimated_runtime, use_case, ai_generated, last_analyzed, file_path,
        input_requirements, expected_outputs, data_flow, business_logic,
        error_handling, data_transformations, webhook_urls, schedules,
        conditional_logic, loops_and_iterations, updated_at
      ) VALUES (
        @id, @name, @description, @category, @tags, @complexity, @nodeCount,
        @nodes, @dependencies, @triggers, @actions, @integrations,
        @estimatedRuntime, @useCase, @aiGenerated, @lastAnalyzed, @filePath,
        @inputRequirements, @expectedOutputs, @dataFlow, @businessLogic,
        @errorHandling, @dataTransformations, @webhookUrls, @schedules,
        @conditionalLogic, @loopsAndIterations, CURRENT_TIMESTAMP
      )
    `);

    stmt.run({
      ...workflow,
      tags: JSON.stringify(workflow.tags),
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

  getAllWorkflows(): WorkflowAnalysis[] {
    const stmt = this.db.prepare('SELECT * FROM workflows ORDER BY updated_at DESC');
    const rows = stmt.all();
    
    return rows.map(row => this.parseWorkflowRow(row));
  }

  getWorkflowById(id: string): WorkflowAnalysis | null {
    const stmt = this.db.prepare('SELECT * FROM workflows WHERE id = ?');
    const row = stmt.get(id);
    
    return row ? this.parseWorkflowRow(row) : null;
  }

  searchWorkflows(query: string): WorkflowAnalysis[] {
    const stmt = this.db.prepare(`
      SELECT * FROM workflows 
      WHERE name LIKE @query 
      OR description LIKE @query 
      OR category LIKE @query 
      OR tags LIKE @query
      ORDER BY updated_at DESC
    `);
    
    const rows = stmt.all({ query: `%${query}%` });
    return rows.map(row => this.parseWorkflowRow(row));
  }

  deleteWorkflow(id: string): void {
    const stmt = this.db.prepare('DELETE FROM workflows WHERE id = ?');
    stmt.run(id);
  }

  clearAllWorkflows(): void {
    this.db.exec('DELETE FROM workflows');
  }

  // Import queue operations
  addToImportQueue(fileName: string, filePath: string, fileContent: string): string {
    const id = Math.random().toString(36).substring(2, 15);
    const stmt = this.db.prepare(`
      INSERT INTO import_queue (id, file_name, file_path, file_content)
      VALUES (?, ?, ?, ?)
    `);
    
    stmt.run(id, fileName, filePath, fileContent);
    return id;
  }

  getNextPendingImport(): any | null {
    const stmt = this.db.prepare(`
      SELECT * FROM import_queue 
      WHERE status = 'pending' 
      ORDER BY created_at ASC 
      LIMIT 1
    `);
    
    return stmt.get();
  }

  updateImportStatus(id: string, status: string, workflowId?: string, errorMessage?: string): void {
    const stmt = this.db.prepare(`
      UPDATE import_queue 
      SET status = ?, workflow_id = ?, error_message = ?, processed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    
    stmt.run(status, workflowId || null, errorMessage || null, id);
  }

  getPendingImportsCount(): number {
    const stmt = this.db.prepare('SELECT COUNT(*) as count FROM import_queue WHERE status = "pending"');
    const result = stmt.get() as { count: number };
    return result.count;
  }

  clearImportQueue(): void {
    this.db.exec('DELETE FROM import_queue');
  }

  // Import session operations
  createImportSession(totalFiles: number, apiKey: string): string {
    const id = Math.random().toString(36).substring(2, 15);
    const stmt = this.db.prepare(`
      INSERT INTO import_sessions (id, total_files, processed_files, failed_files, api_key)
      VALUES (?, ?, 0, 0, ?)
    `);
    
    stmt.run(id, totalFiles, apiKey);
    return id;
  }

  updateImportSession(id: string, processedFiles: number, failedFiles: number): void {
    const stmt = this.db.prepare(`
      UPDATE import_sessions 
      SET processed_files = ?, failed_files = ?
      WHERE id = ?
    `);
    
    stmt.run(processedFiles, failedFiles, id);
  }

  completeImportSession(id: string): void {
    const stmt = this.db.prepare(`
      UPDATE import_sessions 
      SET status = 'completed', completed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    
    stmt.run(id);
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

  // Helper methods
  private parseWorkflowRow(row: any): WorkflowAnalysis {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      category: row.category,
      tags: JSON.parse(row.tags),
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
      loopsAndIterations: JSON.parse(row.loops_and_iterations || '[]')
    };
  }

  close(): void {
    this.db.close();
  }
}