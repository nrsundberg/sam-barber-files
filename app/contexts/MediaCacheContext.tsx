// Global media cache system for cross-component caching

export interface MediaCacheEntry {
  loaded: boolean;
  error?: boolean;
  timestamp: number;
  retryCount?: number;
  lastRetry?: number;
}

// Enhanced global cache with better management
class GlobalMediaCache {
  private cache = new Map<string, MediaCacheEntry>();
  private maxCacheSize = 1000; // Prevent unlimited growth
  private maxAge = 1000 * 60 * 30; // 30 minutes

  // Get cache entry
  get(key: string): MediaCacheEntry | undefined {
    const entry = this.cache.get(key);

    // Check if entry is expired
    if (entry && Date.now() - entry.timestamp > this.maxAge) {
      this.cache.delete(key);
      return undefined;
    }

    return entry;
  }

  // Set cache entry
  set(key: string, entry: MediaCacheEntry): void {
    // Clean up old entries if cache is getting too large
    if (this.cache.size >= this.maxCacheSize) {
      this.cleanup();
    }

    this.cache.set(key, entry);
  }

  // Check if media is loaded and valid
  isLoaded(key: string): boolean {
    const entry = this.get(key);
    return entry?.loaded === true && entry?.error !== true;
  }

  // Check if media has error and should retry
  shouldRetry(key: string): boolean {
    const entry = this.get(key);
    if (!entry) return true; // First attempt
    if (!entry.error) return true; // No error, can load

    // Max 5 attempts total
    if ((entry.retryCount || 0) >= 5) {
      return false; // Stop retrying after 5 attempts
    }

    const timeSinceLastRetry = entry.lastRetry
      ? Date.now() - entry.lastRetry
      : 0;
    const retryDelay = Math.min(
      1000 * Math.pow(2, entry.retryCount || 0),
      30000
    );

    return timeSinceLastRetry > retryDelay;
  }

  // Mark as loading to prevent duplicate requests
  markLoading(key: string): void {
    const existing = this.get(key);
    this.set(key, {
      loaded: false,
      error: false,
      timestamp: Date.now(),
      retryCount: existing?.retryCount || 0,
      lastRetry: existing?.lastRetry,
    });
  }

  // Check if media should be loaded (respects retry limits)
  shouldLoad(key: string): boolean {
    const entry = this.get(key);

    // If no entry, can load
    if (!entry) return true;

    // If already loaded successfully, don't reload
    if (entry.loaded && !entry.error) return false;

    // If currently loading, don't start another request
    if (!entry.loaded && !entry.error && Date.now() - entry.timestamp < 10000) {
      return false; // Still loading (give 10 seconds)
    }

    // If error, check retry limits
    if (entry.error) {
      return this.shouldRetry(key);
    }

    return true;
  }

  // Mark as loaded successfully
  markLoaded(key: string): void {
    this.set(key, {
      loaded: true,
      error: false,
      timestamp: Date.now(),
    });
  }

  // Mark as error with retry tracking
  markError(key: string): void {
    const existing = this.get(key);
    this.set(key, {
      loaded: false,
      error: true,
      timestamp: Date.now(),
      retryCount: (existing?.retryCount || 0) + 1,
      lastRetry: Date.now(),
    });
  }

  // Clean up old entries
  private cleanup(): void {
    const now = Date.now();
    const entries = Array.from(this.cache.entries());

    // Sort by timestamp (oldest first)
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);

    // Remove oldest 25% of entries
    const toRemove = Math.floor(entries.length * 0.25);
    for (let i = 0; i < toRemove; i++) {
      this.cache.delete(entries[i][0]);
    }

    // Also remove expired entries
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.maxAge) {
        this.cache.delete(key);
      }
    }
  }

  // Get cache stats for debugging
  getStats(): { size: number; loaded: number; errors: number } {
    let loaded = 0;
    let errors = 0;

    for (const entry of this.cache.values()) {
      if (entry.loaded) loaded++;
      if (entry.error) errors++;
    }

    return {
      size: this.cache.size,
      loaded,
      errors,
    };
  }

  // Clear all cache
  clear(): void {
    this.cache.clear();
  }
}

// Export singleton instance
export const globalMediaCache = new GlobalMediaCache();

// Helper hook for components to use the cache
export function useMediaCache() {
  const isLoaded = (url: string) => globalMediaCache.isLoaded(url);
  const shouldLoad = (url: string) => globalMediaCache.shouldLoad(url);
  const markLoading = (url: string) => globalMediaCache.markLoading(url);
  const markLoaded = (url: string) => globalMediaCache.markLoaded(url);
  const markError = (url: string) => globalMediaCache.markError(url);
  const hasMaxRetries = (url: string) => {
    const entry = globalMediaCache.get(url);
    return entry?.error && (entry.retryCount || 0) >= 5;
  };

  return {
    isLoaded,
    shouldLoad,
    markLoading,
    markLoaded,
    markError,
    hasMaxRetries,
    getStats: () => globalMediaCache.getStats(),
  };
}
