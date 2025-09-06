'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { WorkflowAnalysis } from '@/types/workflow';
import { WorkflowCard } from '@/components/workflow-card';
import { calculateVisibleRange, throttle } from '@/lib/performance-optimizations';

interface VirtualizedWorkflowGridProps {
  workflows: WorkflowAnalysis[];
  onView?: (workflow: WorkflowAnalysis) => void;
  onCopy?: (workflow: WorkflowAnalysis) => void;
  onDownload?: (workflow: WorkflowAnalysis, format: 'n8n' | 'analysis') => void;
  onVote?: (workflow: WorkflowAnalysis, vote: 'up' | 'down' | null) => void;
  itemHeight?: number;
  overscan?: number;
  className?: string;
}

export function VirtualizedWorkflowGrid({
  workflows,
  onView,
  onCopy,
  onDownload,
  onVote,
  itemHeight = 320, // Approximate height of workflow card
  overscan = 5,
  className = ''
}: VirtualizedWorkflowGridProps) {
  const [containerHeight, setContainerHeight] = useState(600);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerRef, setContainerRef] = useState<HTMLDivElement | null>(null);

  // Calculate grid dimensions
  const [itemsPerRow, setItemsPerRow] = useState(5);

  // Update container dimensions
  useEffect(() => {
    if (!containerRef) return;

    const updateDimensions = () => {
      const rect = containerRef.getBoundingClientRect();
      setContainerHeight(rect.height);
      
      // Calculate items per row based on container width
      const containerWidth = rect.width;
      const itemWidth = 280; // Approximate width of workflow card with gap
      const newItemsPerRow = Math.max(1, Math.floor(containerWidth / itemWidth));
      setItemsPerRow(newItemsPerRow);
    };

    updateDimensions();
    
    const resizeObserver = new ResizeObserver(updateDimensions);
    resizeObserver.observe(containerRef);

    return () => resizeObserver.disconnect();
  }, [containerRef]);

  // Calculate visible range based on grid layout
  const visibleRange = useMemo(() => {
    const totalRows = Math.ceil(workflows.length / itemsPerRow);
    const rowHeight = itemHeight;
    
    return calculateVisibleRange(
      scrollTop,
      containerHeight,
      rowHeight,
      totalRows,
      overscan
    );
  }, [scrollTop, containerHeight, itemHeight, workflows.length, itemsPerRow, overscan]);

  // Get visible items based on row-based calculation
  const visibleItems = useMemo(() => {
    const startRow = visibleRange.startIndex;
    const endRow = visibleRange.endIndex;
    
    const startItemIndex = startRow * itemsPerRow;
    const endItemIndex = Math.min((endRow + 1) * itemsPerRow, workflows.length);
    
    return workflows.slice(startItemIndex, endItemIndex).map((workflow, index) => {
      const actualIndex = startItemIndex + index;
      const row = Math.floor(actualIndex / itemsPerRow);
      const col = actualIndex % itemsPerRow;
      
      return {
        workflow,
        index: actualIndex,
        row,
        col,
        style: {
          position: 'absolute' as const,
          top: row * itemHeight,
          left: col * 280, // Item width + gap
          width: '260px',
          height: `${itemHeight - 20}px` // Account for margin
        }
      };
    });
  }, [workflows, visibleRange, itemsPerRow, itemHeight]);

  // Throttled scroll handler
  const handleScroll = useCallback(
    throttle((e: React.UIEvent<HTMLDivElement>) => {
      setScrollTop(e.currentTarget.scrollTop);
    }, 16), // ~60fps
    []
  );

  // Total height for scrollbar
  const totalHeight = Math.ceil(workflows.length / itemsPerRow) * itemHeight;

  return (
    <div className={`relative overflow-auto ${className}`} style={{ height: '600px' }}>
      <div 
        ref={setContainerRef}
        className="relative"
        style={{ height: totalHeight }}
        onScroll={handleScroll}
      >
        {/* Render only visible items */}
        {visibleItems.map(({ workflow, index, style }) => (
          <div key={workflow.id || index} style={style}>
            <WorkflowCard
              workflow={workflow}
              onView={onView}
              onCopy={onCopy}
              onDownload={onDownload}
              onVote={onVote}
            />
          </div>
        ))}
        
        {/* Loading indicator for empty state */}
        {workflows.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-500">
              <div className="animate-pulse">Loading workflows...</div>
            </div>
          </div>
        )}
      </div>
      
      {/* Performance stats (dev only) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 right-4 bg-black bg-opacity-75 text-white text-xs p-2 rounded">
          <div>Total: {workflows.length}</div>
          <div>Visible: {visibleItems.length}</div>
          <div>Rows: {Math.ceil(workflows.length / itemsPerRow)}</div>
          <div>Items/Row: {itemsPerRow}</div>
          <div>Range: {visibleRange.startIndex}-{visibleRange.endIndex}</div>
        </div>
      )}
    </div>
  );
}

// Higher-order component for easy replacement
export function withVirtualization<P extends object>(
  Component: React.ComponentType<P & { workflows: WorkflowAnalysis[] }>
) {
  return function VirtualizedComponent(props: P & { 
    workflows: WorkflowAnalysis[];
    enableVirtualization?: boolean;
  }) {
    const { enableVirtualization = props.workflows.length > 100, ...componentProps } = props;
    
    if (enableVirtualization) {
      return <VirtualizedWorkflowGrid {...componentProps as any} />;
    }
    
    return <Component {...componentProps as P & { workflows: WorkflowAnalysis[] }} />;
  };
}