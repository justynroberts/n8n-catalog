#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

// Database path
const DB_PATH = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'workflows.db');
const IMPORT_PATH = process.env.IMPORT_PATH || path.join(process.cwd(), 'data', 'export.json');

function initializeDatabase(db) {
  console.log('🏗️ Initializing database schema...');
  
  // Create workflows table with proper schema
  db.exec(`
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
  
  console.log('✅ Database schema initialized');
}

function importData() {
  try {
    console.log('🔍 Checking import file...');
    
    if (!fs.existsSync(IMPORT_PATH)) {
      console.log('❌ Import file not found at:', IMPORT_PATH);
      console.log('💡 Run export-data.js first, or specify IMPORT_PATH environment variable');
      process.exit(1);
    }

    console.log('📂 Reading import file:', IMPORT_PATH);
    const importData = JSON.parse(fs.readFileSync(IMPORT_PATH, 'utf8'));
    
    if (!importData.workflows || !Array.isArray(importData.workflows)) {
      console.log('❌ Invalid import file format - missing workflows array');
      process.exit(1);
    }

    console.log(`📊 Found ${importData.workflows.length} workflows to import`);
    
    // Ensure database directory exists
    const dbDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    console.log('📂 Opening/creating database:', DB_PATH);
    const db = new Database(DB_PATH);
    
    // Initialize schema
    initializeDatabase(db);
    
    // Prepare insert statement
    const insertStmt = db.prepare(`
      INSERT OR REPLACE INTO workflows (
        id, name, description, category, tags, import_tags, complexity,
        node_count, nodes, dependencies, triggers, actions, integrations,
        estimated_runtime, use_case, ai_generated, last_analyzed, file_path,
        input_requirements, expected_outputs, data_flow, business_logic,
        error_handling, data_transformations, webhook_urls, schedules,
        conditional_logic, loops_and_iterations, workflow_data,
        created_at, updated_at
      ) VALUES (
        @id, @name, @description, @category, @tags, @import_tags, @complexity,
        @node_count, @nodes, @dependencies, @triggers, @actions, @integrations,
        @estimated_runtime, @use_case, @ai_generated, @last_analyzed, @file_path,
        @input_requirements, @expected_outputs, @data_flow, @business_logic,
        @error_handling, @data_transformations, @webhook_urls, @schedules,
        @conditional_logic, @loops_and_iterations, @workflow_data,
        @created_at, @updated_at
      )
    `);
    
    // Begin transaction for better performance
    const insertMany = db.transaction((workflows) => {
      let imported = 0;
      let skipped = 0;
      
      for (const workflow of workflows) {
        try {
          // Stringify JSON fields
          const jsonFields = ['nodes', 'triggers', 'integrations', 'workflowData'];
          const processedWorkflow = { ...workflow };
          
          jsonFields.forEach(field => {
            if (processedWorkflow[field] && typeof processedWorkflow[field] === 'object') {
              processedWorkflow[field] = JSON.stringify(processedWorkflow[field]);
            }
          });
          
          // Map camelCase to snake_case for database columns
          const dbRecord = {
            id: processedWorkflow.id,
            name: processedWorkflow.name,
            description: processedWorkflow.description,
            category: processedWorkflow.category,
            tags: processedWorkflow.tags,
            import_tags: processedWorkflow.import_tags || processedWorkflow.importTags,
            complexity: processedWorkflow.complexity,
            node_count: processedWorkflow.node_count || processedWorkflow.nodeCount,
            nodes: processedWorkflow.nodes,
            dependencies: processedWorkflow.dependencies,
            triggers: processedWorkflow.triggers,
            actions: processedWorkflow.actions,
            integrations: processedWorkflow.integrations,
            estimated_runtime: processedWorkflow.estimated_runtime || processedWorkflow.estimatedRuntime,
            use_case: processedWorkflow.use_case || processedWorkflow.useCase,
            ai_generated: processedWorkflow.ai_generated || processedWorkflow.aiGenerated,
            last_analyzed: processedWorkflow.last_analyzed || processedWorkflow.lastAnalyzed,
            file_path: processedWorkflow.file_path || processedWorkflow.filePath,
            input_requirements: processedWorkflow.input_requirements || processedWorkflow.inputRequirements,
            expected_outputs: processedWorkflow.expected_outputs || processedWorkflow.expectedOutputs,
            data_flow: processedWorkflow.data_flow || processedWorkflow.dataFlow,
            business_logic: processedWorkflow.business_logic || processedWorkflow.businessLogic,
            error_handling: processedWorkflow.error_handling || processedWorkflow.errorHandling,
            data_transformations: processedWorkflow.data_transformations || processedWorkflow.dataTransformations,
            webhook_urls: processedWorkflow.webhook_urls || processedWorkflow.webhookUrls,
            schedules: processedWorkflow.schedules,
            conditional_logic: processedWorkflow.conditional_logic || processedWorkflow.conditionalLogic,
            loops_and_iterations: processedWorkflow.loops_and_iterations || processedWorkflow.loopsAndIterations,
            workflow_data: processedWorkflow.workflow_data || processedWorkflow.workflowData,
            created_at: processedWorkflow.created_at || processedWorkflow.createdAt,
            updated_at: processedWorkflow.updated_at || processedWorkflow.updatedAt
          };
          
          insertStmt.run(dbRecord);
          imported++;
          
          if (imported % 100 === 0) {
            console.log(`⏳ Imported ${imported}/${workflows.length} workflows...`);
          }
          
        } catch (error) {
          console.warn(`⚠️ Skipped workflow ${workflow.id || 'unknown'}: ${error.message}`);
          skipped++;
        }
      }
      
      return { imported, skipped };
    });
    
    console.log('💾 Starting import...');
    const result = insertMany(importData.workflows);
    
    // Get final statistics
    const stats = db.prepare(`
      SELECT 
        COUNT(*) as total_workflows,
        COUNT(DISTINCT category) as unique_categories,
        COUNT(*) FILTER (WHERE complexity IS NOT NULL) as complex_workflows,
        datetime('now') as import_date
    `).get();
    
    console.log('✅ Import completed successfully!');
    console.log(`📊 Imported: ${result.imported} workflows`);
    console.log(`⚠️ Skipped: ${result.skipped} workflows`);
    console.log(`📈 Total in database: ${stats.total_workflows}`);
    console.log(`🏷️ Categories: ${stats.unique_categories}`);
    console.log(`🔧 Complex workflows: ${stats.complex_workflows}`);
    
    // Import metadata
    if (importData.metadata) {
      console.log('📋 Import metadata:', {
        originalExport: importData.metadata.export_date,
        originalTotal: importData.metadata.total_workflows,
        importedNow: result.imported
      });
    }
    
    db.close();
    
  } catch (error) {
    console.error('❌ Import failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
📦 n8n Catalog Data Import Utility

Usage:
  node scripts/import-data.js [options]

Environment Variables:
  DATABASE_PATH    Path to SQLite database (default: ./data/workflows.db)
  IMPORT_PATH      Path to import JSON file (default: ./data/export.json)

Options:
  -h, --help       Show this help message

Examples:
  # Import from default location
  node scripts/import-data.js
  
  # Import from custom location
  IMPORT_PATH=/path/to/backup.json node scripts/import-data.js
  
  # Import to custom database
  DATABASE_PATH=/app/data/new.db node scripts/import-data.js
`);
    process.exit(0);
  }
  
  importData();
}

module.exports = { importData };