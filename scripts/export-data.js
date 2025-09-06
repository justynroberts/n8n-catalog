#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

// Database path
const DB_PATH = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'catalog.db');
const EXPORT_PATH = path.join(process.cwd(), 'data', 'export.json');

function exportData() {
  try {
    console.log('🔍 Checking database existence...');
    
    if (!fs.existsSync(DB_PATH)) {
      console.log('❌ Database not found at:', DB_PATH);
      process.exit(1);
    }

    console.log('📂 Opening database:', DB_PATH);
    const db = new Database(DB_PATH, { readonly: true });
    
    // Get all workflows
    console.log('📊 Exporting workflows...');
    const workflows = db.prepare('SELECT * FROM workflows').all();
    console.log(`✅ Found ${workflows.length} workflows`);
    
    // Get database info
    const dbInfo = db.prepare(`
      SELECT 
        COUNT(*) as total_workflows,
        datetime('now') as export_date,
        (SELECT COUNT(*) FROM workflows WHERE complexity IS NOT NULL) as complex_workflows,
        (SELECT COUNT(DISTINCT category) FROM workflows WHERE category IS NOT NULL) as unique_categories
    `).get();

    // Parse JSON fields that are stored as strings
    const processedWorkflows = workflows.map(workflow => {
      const processed = { ...workflow };
      
      // Parse JSON fields
      const jsonFields = ['nodes', 'triggers', 'integrations', 'workflowData'];
      jsonFields.forEach(field => {
        if (processed[field] && typeof processed[field] === 'string') {
          try {
            processed[field] = JSON.parse(processed[field]);
          } catch (e) {
            console.warn(`⚠️ Failed to parse ${field} for workflow ${workflow.id}`);
          }
        }
      });
      
      return processed;
    });

    const exportData = {
      metadata: {
        ...dbInfo,
        export_version: '1.0',
        source: 'n8n-catalog',
        export_timestamp: new Date().toISOString()
      },
      workflows: processedWorkflows
    };

    // Ensure export directory exists
    const exportDir = path.dirname(EXPORT_PATH);
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }

    // Write export file
    console.log('💾 Writing export file...');
    fs.writeFileSync(EXPORT_PATH, JSON.stringify(exportData, null, 2));
    
    // Calculate file size
    const stats = fs.statSync(EXPORT_PATH);
    const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    
    console.log('✅ Export completed successfully!');
    console.log(`📁 Export file: ${EXPORT_PATH}`);
    console.log(`📏 File size: ${fileSizeMB} MB`);
    console.log(`📊 Exported ${workflows.length} workflows`);
    console.log(`🏷️ Categories: ${dbInfo.unique_categories}`);
    console.log(`🔧 Complex workflows: ${dbInfo.complex_workflows}`);
    
    db.close();
    
  } catch (error) {
    console.error('❌ Export failed:', error.message);
    process.exit(1);
  }
}

// Run export if called directly
if (require.main === module) {
  exportData();
}

module.exports = { exportData };