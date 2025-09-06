// Performance optimization utilities

// Debounce function for search inputs
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Throttle function for scroll events
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

// Lazy loading utility for images
export function createIntersectionObserver(
  callback: (entries: IntersectionObserverEntry[]) => void,
  options: IntersectionObserverInit = {}
) {
  if (typeof window === 'undefined') return null;
  
  const defaultOptions: IntersectionObserverInit = {
    root: null,
    rootMargin: '50px',
    threshold: 0.1,
    ...options
  };

  return new IntersectionObserver(callback, defaultOptions);
}

// Virtual scrolling utilities
export function calculateVisibleRange(
  scrollTop: number,
  containerHeight: number,
  itemHeight: number,
  totalItems: number,
  overscan: number = 5
) {
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const visibleCount = Math.ceil(containerHeight / itemHeight);
  const endIndex = Math.min(totalItems - 1, startIndex + visibleCount + overscan * 2);
  
  return {
    startIndex,
    endIndex,
    visibleCount,
    offsetY: startIndex * itemHeight
  };
}

// Memory optimization for large datasets
export function batchProcess<T>(
  items: T[],
  batchSize: number,
  processor: (batch: T[], batchIndex: number) => Promise<void>
): Promise<void> {
  return new Promise((resolve, reject) => {
    let currentBatch = 0;
    const totalBatches = Math.ceil(items.length / batchSize);
    
    function processBatch() {
      if (currentBatch >= totalBatches) {
        resolve();
        return;
      }
      
      const start = currentBatch * batchSize;
      const end = Math.min(start + batchSize, items.length);
      const batch = items.slice(start, end);
      
      processor(batch, currentBatch)
        .then(() => {
          currentBatch++;
          // Use setTimeout to yield control back to the event loop
          setTimeout(processBatch, 0);
        })
        .catch(reject);
    }
    
    processBatch();
  });
}

// Component memoization helper
export function createMemoizedComponent<P extends object>(
  Component: React.ComponentType<P>,
  areEqual?: (prevProps: P, nextProps: P) => boolean
) {
  return React.memo(Component, areEqual);
}

// Performance monitoring
export class PerformanceMonitor {
  private static measures: Map<string, number> = new Map();
  
  static start(name: string) {
    if (typeof performance !== 'undefined') {
      performance.mark(`${name}-start`);
      this.measures.set(name, Date.now());
    }
  }
  
  static end(name: string): number {
    if (typeof performance !== 'undefined') {
      performance.mark(`${name}-end`);
      performance.measure(name, `${name}-start`, `${name}-end`);
      
      const measure = performance.getEntriesByName(name, 'measure')[0];
      const duration = measure ? measure.duration : Date.now() - (this.measures.get(name) || 0);
      
      this.measures.delete(name);
      return duration;
    }
    
    const startTime = this.measures.get(name);
    if (startTime) {
      const duration = Date.now() - startTime;
      this.measures.delete(name);
      return duration;
    }
    
    return 0;
  }
  
  static getEntries(name?: string) {
    if (typeof performance !== 'undefined') {
      return name ? performance.getEntriesByName(name) : performance.getEntries();
    }
    return [];
  }
  
  static clear() {
    if (typeof performance !== 'undefined') {
      performance.clearMarks();
      performance.clearMeasures();
    }
    this.measures.clear();
  }
}

// Request optimization
export class RequestBatcher {
  private batches: Map<string, {
    requests: Array<{ resolve: Function; reject: Function; params: any }>;
    timeout: NodeJS.Timeout;
  }> = new Map();
  
  constructor(private batchDelay: number = 50) {}
  
  batch<T>(
    key: string,
    params: any,
    executor: (batchedParams: any[]) => Promise<T[]>
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      let batch = this.batches.get(key);
      
      if (!batch) {
        batch = {
          requests: [],
          timeout: setTimeout(() => this.executeBatch(key, executor), this.batchDelay)
        };
        this.batches.set(key, batch);
      }
      
      batch.requests.push({ resolve, reject, params });
    });
  }
  
  private async executeBatch<T>(key: string, executor: (params: any[]) => Promise<T[]>) {
    const batch = this.batches.get(key);
    if (!batch) return;
    
    this.batches.delete(key);
    clearTimeout(batch.timeout);
    
    try {
      const params = batch.requests.map(req => req.params);
      const results = await executor(params);
      
      batch.requests.forEach((request, index) => {
        request.resolve(results[index]);
      });
    } catch (error) {
      batch.requests.forEach(request => {
        request.reject(error);
      });
    }
  }
}

// Export React import for createMemoizedComponent
import React from 'react';