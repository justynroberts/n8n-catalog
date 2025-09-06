'use client';

import { useState, useCallback, useRef } from 'react';
import { Upload, Folder, File, AlertCircle, CheckCircle, X } from 'lucide-react';
import { FileScanner } from '@/lib/file-scanner';
import { UploadedFile } from '@/types/workflow';

interface FileUploadProps {
  onFilesSelected: (files: UploadedFile[]) => void;
  onError?: (error: string) => void;
  maxFiles?: number;
  className?: string;
}

export function FileUpload({ 
  onFilesSelected, 
  onError, 
  maxFiles = Infinity,
  className = '' 
}: FileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [validationResults, setValidationResults] = useState<{
    valid: UploadedFile[];
    invalid: { file: UploadedFile; error: string }[];
  } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dirInputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    
    const items = Array.from(e.dataTransfer.items);
    const files = Array.from(e.dataTransfer.files);
    
    // Check if we have directory entries
    const hasDirectories = items.some(item => item.webkitGetAsEntry()?.isDirectory);
    
    if (hasDirectories) {
      await handleDirectoryDrop(items);
    } else {
      await handleFilesDrop(files);
    }
  }, []);

  const handleDirectoryDrop = async (items: DataTransferItem[]) => {
    setIsProcessing(true);
    try {
      const allFiles: UploadedFile[] = [];
      
      for (const item of items) {
        const entry = item.webkitGetAsEntry();
        if (entry) {
          const files = await processDirectoryEntry(entry);
          allFiles.push(...files);
        }
      }
      
      await processFiles(allFiles);
    } catch (error) {
      onError?.(`Failed to process directories: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    setIsProcessing(false);
  };

  const handleFilesDrop = async (files: File[]) => {
    setIsProcessing(true);
    try {
      const uploadedFiles = await FileScanner.scanFiles(files);
      await processFiles(uploadedFiles);
    } catch (error) {
      onError?.(`Failed to process files: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    setIsProcessing(false);
  };

  const processDirectoryEntry = async (entry: FileSystemEntry): Promise<UploadedFile[]> => {
    const files: UploadedFile[] = [];
    
    if (entry.isFile) {
      const fileEntry = entry as FileSystemFileEntry;
      const file = await new Promise<File>((resolve, reject) => {
        fileEntry.file(resolve, reject);
      });
      
      if (FileScanner.isValidWorkflowFile(file)) {
        const content = await FileScanner.readFileContent(file);
        files.push({
          name: file.name,
          path: entry.fullPath,
          size: file.size,
          type: file.type,
          content,
          lastModified: file.lastModified
        });
      }
    } else if (entry.isDirectory) {
      const dirEntry = entry as FileSystemDirectoryEntry;
      const reader = dirEntry.createReader();
      
      const entries = await new Promise<FileSystemEntry[]>((resolve, reject) => {
        reader.readEntries(resolve, reject);
      });
      
      for (const childEntry of entries) {
        const childFiles = await processDirectoryEntry(childEntry);
        files.push(...childFiles);
      }
    }
    
    return files;
  };

  const processFiles = async (files: UploadedFile[]) => {
    if (files.length === 0) {
      onError?.('No valid JSON files found');
      return;
    }
    
    // No file limit - handle unlimited files with chunked processing
    
    setUploadedFiles(files);
    
    // Validate workflow files
    const results = await FileScanner.validateWorkflowFiles(files);
    setValidationResults(results);
    
    if (results.valid.length > 0) {
      onFilesSelected(results.valid);
    }
    
    if (results.invalid.length > 0) {
      onError?.(`${results.invalid.length} files failed validation. Check the details below.`);
    }
  };

  const handleFileSelect = async () => {
    fileInputRef.current?.click();
  };

  const handleDirectorySelect = async () => {
    if (FileScanner.isFileSystemAccessSupported()) {
      try {
        // @ts-ignore - showDirectoryPicker is not in TypeScript types yet
        const dirHandle = await window.showDirectoryPicker();
        setIsProcessing(true);
        const files = await FileScanner.scanDirectory(dirHandle);
        await processFiles(files);
        setIsProcessing(false);
      } catch (error) {
        if (error instanceof Error && error.name !== 'AbortError') {
          onError?.(`Failed to select directory: ${error.message}`);
        }
        setIsProcessing(false);
      }
    } else {
      // Fallback for browsers without File System Access API
      dirInputRef.current?.click();
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      setIsProcessing(true);
      await handleFilesDrop(Array.from(files));
      setIsProcessing(false);
    }
  };

  const clearFiles = () => {
    setUploadedFiles([]);
    setValidationResults(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (dirInputRef.current) dirInputRef.current.value = '';
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Upload Zone */}
      <div
        className={`drag-zone ${isDragOver ? 'drag-over' : ''} ${isProcessing ? 'opacity-50' : ''}`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center space-y-4">
          <div className="p-4 rounded-full bg-uber-gray-800">
            <Upload className="text-uber-green" size={32} />
          </div>
          
          <div className="text-center">
            <h3 className="text-xl font-semibold text-white mb-2">
              Upload n8n Workflows
            </h3>
            <p className="text-uber-gray-400 mb-4">
              Drag and drop JSON files or directories, or click to browse
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={handleFileSelect}
                disabled={isProcessing}
                className="uber-button-secondary flex items-center space-x-2"
              >
                <File size={18} />
                <span>Select Files</span>
              </button>
              
              <button
                onClick={handleDirectorySelect}
                disabled={isProcessing}
                className="uber-button-secondary flex items-center space-x-2"
              >
                <Folder size={18} />
                <span>Select Directory</span>
              </button>
            </div>
          </div>
          
          <div className="text-xs text-gray-500 text-center">
            Supports JSON files up to 10MB each<br />
            <span className="text-green-400">✨ No file limit • Large uploads processed in chunks • Duplicate files automatically skipped</span>
          </div>
        </div>
      </div>

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".json"
        onChange={handleFileInputChange}
        className="hidden"
      />
      
      <input
        ref={dirInputRef}
        type="file"
        // @ts-ignore - webkitdirectory is not in TypeScript types
        webkitdirectory=""
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* Processing indicator */}
      {isProcessing && (
        <div className="glass-card p-4">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-uber-green"></div>
            <span className="text-white">Processing files...</span>
          </div>
        </div>
      )}

      {/* Validation Results */}
      {validationResults && (
        <div className="space-y-4">
          {/* Valid files */}
          {validationResults.valid.length > 0 && (
            <div className="glass-card p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="text-uber-green" size={18} />
                  <h4 className="text-white font-medium">
                    Valid Workflows ({validationResults.valid.length})
                  </h4>
                </div>
                <button
                  onClick={clearFiles}
                  className="text-uber-gray-400 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>
              
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {validationResults.valid.slice(0, 10).map((file, index) => (
                  <div key={index} className="flex items-center space-x-3 text-sm">
                    <File className="text-uber-green" size={14} />
                    <span className="text-white truncate flex-1">{file.name}</span>
                    <span className="text-uber-gray-400">
                      {(file.size / 1024).toFixed(1)}KB
                    </span>
                  </div>
                ))}
                {validationResults.valid.length > 10 && (
                  <div className="text-uber-gray-400 text-sm">
                    ... and {validationResults.valid.length - 10} more files
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Invalid files */}
          {validationResults.invalid.length > 0 && (
            <div className="glass-card p-4 border-uber-red/30">
              <div className="flex items-center space-x-2 mb-3">
                <AlertCircle className="text-uber-red" size={18} />
                <h4 className="text-white font-medium">
                  Invalid Files ({validationResults.invalid.length})
                </h4>
              </div>
              
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {validationResults.invalid.slice(0, 5).map((item, index) => (
                  <div key={index} className="text-sm">
                    <div className="flex items-center space-x-3">
                      <AlertCircle className="text-uber-red" size={14} />
                      <span className="text-white truncate flex-1">{item.file.name}</span>
                    </div>
                    <div className="text-uber-red text-xs ml-5 mt-1">
                      {item.error}
                    </div>
                  </div>
                ))}
                {validationResults.invalid.length > 5 && (
                  <div className="text-uber-gray-400 text-sm">
                    ... and {validationResults.invalid.length - 5} more files
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}