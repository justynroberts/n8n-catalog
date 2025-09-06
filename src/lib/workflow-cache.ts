import { WorkflowAnalysis } from '@/types/workflow';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  etag?: string;
}

interface CacheConfig {
  memoryTTL: number; // Memory cache TTL in ms
  persistentTTL: number; // IndexedDB cache TTL in ms
  maxMemorySize: number; // Max items in memory
}

class WorkflowCache {
  private memoryCache = new Map<string, CacheEntry<any>>();
  private dbName = 'n8n-catalog-cache';
  private dbVersion = 1;
  private db: IDBDatabase | null = null;
  private config: CacheConfig = {
    memoryTTL: 5 * 60 * 1000, // 5 minutes
    persistentTTL: 30 * 60 * 1000, // 30 minutes
    maxMemorySize: 100
  };

  constructor(config?: Partial<CacheConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
    this.initDB();
  }

  private async initDB(): Promise<void> {
    if (typeof window === 'undefined') return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create stores
        if (!db.objectStoreNames.contains('workflows')) {
          db.createObjectStore('workflows', { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains('metadata')) {
          db.createObjectStore('metadata', { keyPath: 'key' });
        }
      };
    });
  }

  private isExpired(entry: CacheEntry<any>, ttl: number): boolean {
    return Date.now() - entry.timestamp > ttl;
  }

  private evictMemoryCache(): void {
    if (this.memoryCache.size <= this.config.maxMemorySize) return;

    // Remove oldest entries
    const entries = Array.from(this.memoryCache.entries())
      .sort(([,a], [,b]) => a.timestamp - b.timestamp);
    
    const toRemove = entries.slice(0, entries.length - this.config.maxMemorySize);
    toRemove.forEach(([key]) => this.memoryCache.delete(key));
  }

  // Memory cache operations
  setMemory<T>(key: string, data: T, etag?: string): void {
    this.memoryCache.set(key, {
      data,
      timestamp: Date.now(),
      etag
    });
    this.evictMemoryCache();
  }

  getMemory<T>(key: string): T | null {
    const entry = this.memoryCache.get(key);
    if (!entry || this.isExpired(entry, this.config.memoryTTL)) {
      this.memoryCache.delete(key);
      return null;
    }
    return entry.data;
  }

  // Persistent cache operations
  async setPersistent<T>(key: string, data: T, etag?: string): Promise<void> {
    if (!this.db) await this.initDB();
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['workflows'], 'readwrite');
      const store = transaction.objectStore('workflows');
      
      const entry: CacheEntry<T> & { key: string } = {
        key,
        data,
        timestamp: Date.now(),
        etag
      };
      
      const request = store.put(entry);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getPersistent<T>(key: string): Promise<T | null> {
    if (!this.db) await this.initDB();
    if (!this.db) return null;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['workflows'], 'readonly');
      const store = transaction.objectStore('workflows');
      const request = store.get(key);
      
      request.onsuccess = () => {
        const entry = request.result as (CacheEntry<T> & { key: string }) | undefined;
        if (!entry || this.isExpired(entry, this.config.persistentTTL)) {
          // Clean up expired entry
          this.deletePersistent(key);
          resolve(null);
          return;
        }
        resolve(entry.data);
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  async deletePersistent(key: string): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['workflows'], 'readwrite');
      const store = transaction.objectStore('workflows');
      const request = store.delete(key);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Combined cache operations
  async get<T>(key: string): Promise<T | null> {
    // Try memory cache first
    const memoryResult = this.getMemory<T>(key);
    if (memoryResult !== null) {
      return memoryResult;
    }

    // Try persistent cache
    const persistentResult = await this.getPersistent<T>(key);
    if (persistentResult !== null) {
      // Populate memory cache
      this.setMemory(key, persistentResult);
      return persistentResult;
    }

    return null;
  }

  async set<T>(key: string, data: T, etag?: string): Promise<void> {
    // Set in both caches
    this.setMemory(key, data, etag);
    await this.setPersistent(key, data, etag);
  }

  async invalidate(key: string): Promise<void> {
    this.memoryCache.delete(key);
    await this.deletePersistent(key);
  }

  async clear(): Promise<void> {
    this.memoryCache.clear();
    
    if (!this.db) return;
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['workflows'], 'readwrite');
      const store = transaction.objectStore('workflows');
      const request = store.clear();
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // ETags for conditional requests
  async getEtag(key: string): Promise<string | null> {
    const entry = this.memoryCache.get(key);
    if (entry) return entry.etag || null;

    if (!this.db) return null;
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['workflows'], 'readonly');
      const store = transaction.objectStore('workflows');
      const request = store.get(key);
      
      request.onsuccess = () => {
        const entry = request.result as (CacheEntry<any> & { key: string }) | undefined;
        resolve(entry?.etag || null);
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  // Cache statistics
  getStats() {
    return {
      memorySize: this.memoryCache.size,
      maxMemorySize: this.config.maxMemorySize,
      memoryTTL: this.config.memoryTTL,
      persistentTTL: this.config.persistentTTL
    };
  }
}

export default WorkflowCache;