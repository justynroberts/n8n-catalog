import { UploadedFile, N8nWorkflow } from '@/types/workflow';
import { WorkflowParser } from './workflow-parser';

export class FileScanner {
  static async scanFiles(files: FileList | File[]): Promise<UploadedFile[]> {
    const uploadedFiles: UploadedFile[] = [];
    
    for (const file of Array.from(files)) {
      if (this.isValidWorkflowFile(file)) {
        const content = await this.readFileContent(file);
        uploadedFiles.push({
          name: file.name,
          path: file.name,
          size: file.size,
          type: file.type,
          content,
          lastModified: file.lastModified
        });
      }
    }
    
    return uploadedFiles;
  }

  static async scanDirectory(directoryHandle: any): Promise<UploadedFile[]> {
    const files: UploadedFile[] = [];
    
    for await (const [name, handle] of directoryHandle.entries()) {
      if (handle.kind === 'file') {
        const file = await handle.getFile();
        if (this.isValidWorkflowFile(file)) {
          const content = await this.readFileContent(file);
          files.push({
            name: file.name,
            path: `${directoryHandle.name}/${name}`,
            size: file.size,
            type: file.type,
            content,
            lastModified: file.lastModified
          });
        }
      } else if (handle.kind === 'directory') {
        // Recursively scan subdirectories
        const subFiles = await this.scanDirectory(handle);
        files.push(...subFiles.map(f => ({
          ...f,
          path: `${directoryHandle.name}/${f.path}`
        })));
      }
    }
    
    return files;
  }

  static isValidWorkflowFile(file: File): boolean {
    // Check file extension
    if (!file.name.toLowerCase().endsWith('.json')) {
      return false;
    }
    
    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return false;
    }
    
    return true;
  }

  static async readFileContent(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          resolve(e.target.result as string);
        } else {
          reject(new Error('Failed to read file'));
        }
      };
      reader.onerror = () => reject(new Error('File reading error'));
      reader.readAsText(file);
    });
  }

  static async validateWorkflowFiles(files: UploadedFile[]): Promise<{
    valid: UploadedFile[];
    invalid: { file: UploadedFile; error: string }[];
  }> {
    const valid: UploadedFile[] = [];
    const invalid: { file: UploadedFile; error: string }[] = [];
    
    for (const file of files) {
      if (!file.content) {
        invalid.push({ file, error: 'No content found' });
        continue;
      }
      
      try {
        const workflow = WorkflowParser.parseWorkflowFile(file.content, file.path);
        if (!workflow) {
          invalid.push({ file, error: 'Invalid n8n workflow format' });
          continue;
        }
        
        if (!workflow.nodes || !Array.isArray(workflow.nodes)) {
          invalid.push({ file, error: 'No nodes found in workflow' });
          continue;
        }
        
        if (workflow.nodes.length === 0) {
          invalid.push({ file, error: 'Empty workflow (no nodes)' });
          continue;
        }
        
        valid.push(file);
      } catch (error) {
        invalid.push({ file, error: `Parse error: ${error instanceof Error ? error.message : 'Unknown error'}` });
      }
    }
    
    return { valid, invalid };
  }

  static getFileStats(files: UploadedFile[]): {
    totalFiles: number;
    totalSize: number;
    averageSize: number;
    fileTypes: Record<string, number>;
    oldestFile: Date | null;
    newestFile: Date | null;
  } {
    if (files.length === 0) {
      return {
        totalFiles: 0,
        totalSize: 0,
        averageSize: 0,
        fileTypes: {},
        oldestFile: null,
        newestFile: null
      };
    }
    
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    const fileTypes: Record<string, number> = {};
    const dates = files.map(f => new Date(f.lastModified));
    
    files.forEach(file => {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'unknown';
      fileTypes[ext] = (fileTypes[ext] || 0) + 1;
    });
    
    return {
      totalFiles: files.length,
      totalSize,
      averageSize: totalSize / files.length,
      fileTypes,
      oldestFile: new Date(Math.min(...dates.map(d => d.getTime()))),
      newestFile: new Date(Math.max(...dates.map(d => d.getTime())))
    };
  }

  // Browser File System Access API support check
  static isFileSystemAccessSupported(): boolean {
    return 'showDirectoryPicker' in window;
  }

  // Fallback for browsers without File System Access API
  static createDirectoryInput(): HTMLInputElement {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = '.json';
    // @ts-ignore - webkitdirectory is not in TypeScript types
    input.webkitdirectory = true;
    return input;
  }
}