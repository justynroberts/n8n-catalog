import { NextRequest, NextResponse } from 'next/server';
import { SQLiteDatabase } from '@/lib/db/sqlite';
import { WorkflowParser } from '@/lib/workflow-parser';
import { AIAnalyzer } from '@/lib/ai-analyzer';
import { requireAuthHeader } from '@/lib/auth';

const db = SQLiteDatabase.getInstance();

export async function POST(request: NextRequest) {
  // Check authentication
  const { authenticated, response } = await requireAuthHeader(request);
  if (!authenticated) {
    return response!;
  }
  
  try {
    const body = await request.json();
    const { files, apiKey, importTag = 'internetsourced' } = body;
    console.log('Import API received tag:', importTag);

    if (!files || !Array.isArray(files) || !apiKey) {
      return NextResponse.json({ error: 'Missing files or API key' }, { status: 400 });
    }

    // Filter out already cached files and duplicates within this batch
    const newFiles = [];
    let skippedCount = 0;
    const seenWorkflowIds = new Set<string>();

    for (const file of files) {
      // Generate deterministic ID for duplicate detection
      let workflowId: string | undefined;
      try {
        const workflowData = WorkflowParser.parseWorkflowFile(file.content, file.path);
        if (workflowData) {
          // Generate the same deterministic ID that will be used in analysis
          const content = JSON.stringify({
            name: workflowData.name,
            nodes: workflowData.nodes?.map(n => ({ type: n.type, position: n.position })) || [],
            connections: workflowData.connections || {}
          });
          let hash = 0;
          for (let i = 0; i < content.length; i++) {
            const char = content.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
          }
          workflowId = Math.abs(hash).toString(36);
          
          // Check for duplicates within this batch
          if (seenWorkflowIds.has(workflowId)) {
            skippedCount++;
            console.log('Skipping duplicate workflow in batch:', file.name, 'ID:', workflowId);
            continue;
          }
        }
      } catch (error) {
        console.warn('Failed to parse workflow for duplicate detection:', file.name, error);
      }

      // Check if already exists in database
      const cached = db.isWorkflowCached(file.name, file.path, workflowId);
      if (!cached) {
        newFiles.push(file);
        if (workflowId) {
          seenWorkflowIds.add(workflowId);
        }
      } else {
        skippedCount++;
        console.log('Skipping cached workflow:', file.name, 'ID:', workflowId);
      }
    }

    if (newFiles.length === 0) {
      return NextResponse.json({ 
        error: 'All files are already catalogued',
        skippedCount
      }, { status: 400 });
    }

    // Create import session with import tag
    const sessionId = db.createImportSession(newFiles.length, apiKey, importTag);

    // Add files to queue
    for (const file of newFiles) {
      db.addToImportQueue(
        sessionId,
        file.name,
        file.path || '',
        file.content || '',
        file.size || 0
      );
    }

    // Update session with skipped count
    db.updateImportSession(sessionId, { skipped_files: skippedCount });

    return NextResponse.json({
      sessionId,
      totalFiles: newFiles.length,
      skippedCount
    });
  } catch (error) {
    console.error('Failed to start import:', error);
    return NextResponse.json({ error: 'Failed to start import' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const action = searchParams.get('action');

    if (action === 'status') {
      // Get import status for progress bar
      const session = sessionId ? db.getImportSession(sessionId) : db.getActiveImportSession();
      
      if (!session) {
        return NextResponse.json(null);
      }

      // Get current processing item
      const currentItem = db.getCurrentProcessingItem(sessionId || session.id);
      
      return NextResponse.json({
        sessionId: session.id,
        totalFiles: session.total_files,
        processedFiles: session.processed_files,
        currentFile: currentItem?.file_name || '',
        isComplete: session.status === 'completed',
        hasError: session.failed_files > 0,
        errorMessage: session.failed_files > 0 ? `${session.failed_files} files failed` : undefined
      });
    }

    if (action === 'cancel' && sessionId) {
      // Cancel import session
      const session = db.getImportSession(sessionId);
      if (!session) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 });
      }
      
      if (session.status !== 'active') {
        return NextResponse.json({ error: 'Session not active' }, { status: 400 });
      }
      
      db.cancelImportSession(sessionId);
      
      return NextResponse.json({
        success: true,
        message: 'Import session cancelled successfully'
      });
    }

    if (action === 'process' && sessionId) {
      // Process next item in queue
      const session = db.getImportSession(sessionId);
      if (!session || session.status !== 'active') {
        return NextResponse.json({ error: 'Session not active' }, { status: 400 });
      }

      const nextItem = db.getNextPendingImport(sessionId);
      if (!nextItem) {
        // No more items, complete session
        db.updateImportSession(sessionId, { status: 'completed' });
        return NextResponse.json({ completed: true });
      }

      // Process the item
      try {
        // Mark as processing
        db.updateImportStatus(nextItem.id, 'processing');

        // Parse workflow
        const workflowData = WorkflowParser.parseWorkflowFile(
          nextItem.file_content,
          nextItem.file_path
        );

        if (!workflowData) {
          throw new Error('Invalid workflow format');
        }

        // Analyze with AI
        const analyzer = new AIAnalyzer(session.api_key);
        const analysis = await analyzer.analyzeWorkflow(workflowData, nextItem.file_path);

        // Add import tag from session to the workflow analysis
        analysis.importTags = session.import_tag;

        // Save workflow
        db.saveWorkflow(analysis);

        // Update import status
        db.updateImportStatus(nextItem.id, 'completed', analysis.id);

        // Update session progress
        const updatedSession = db.getImportSession(sessionId);
        db.updateImportSession(sessionId, {
          processed_files: updatedSession.processed_files + 1
        });

        return NextResponse.json({
          success: true,
          workflow: analysis,
          fileName: nextItem.file_name,
          progress: {
            processed: updatedSession.processed_files + 1,
            total: session.total_files
          }
        });

      } catch (error) {
        console.error(`Failed to process ${nextItem.file_name}:`, error);
        
        // Update import status as failed
        db.updateImportStatus(
          nextItem.id,
          'failed',
          undefined,
          error instanceof Error ? error.message : 'Unknown error'
        );

        // Update session progress
        const updatedSession = db.getImportSession(sessionId);
        db.updateImportSession(sessionId, {
          failed_files: updatedSession.failed_files + 1
        });

        return NextResponse.json({
          error: true,
          message: error instanceof Error ? error.message : 'Unknown error',
          fileName: nextItem.file_name
        });
      }
    }

    if (sessionId) {
      // Get session status
      const session = db.getImportSession(sessionId);
      const pendingCount = db.getPendingImportsCount(sessionId);
      
      if (!session) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 });
      }
      
      return NextResponse.json({
        id: session.id,
        status: session.status,
        total_files: session.total_files,
        processed_files: session.processed_files,
        failed_files: session.failed_files,
        skipped_files: session.skipped_files,
        started_at: session.started_at,
        completed_at: session.completed_at,
        pendingCount
      });
    }

    // Get active session
    const activeSession = db.getActiveImportSession();
    if (!activeSession) {
      return NextResponse.json(null);
    }
    
    return NextResponse.json({
      id: activeSession.id,
      status: activeSession.status,
      total_files: activeSession.total_files,
      processed_files: activeSession.processed_files,
      failed_files: activeSession.failed_files,
      skipped_files: activeSession.skipped_files,
      started_at: activeSession.started_at,
      completed_at: activeSession.completed_at
    });

  } catch (error) {
    console.error('Failed to get import status:', error);
    return NextResponse.json({ error: 'Failed to get import status' }, { status: 500 });
  }
}