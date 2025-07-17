import React, { createContext, useContext } from "react";

interface MediaCacheEntry {
  loaded: boolean;
  error: boolean;
  timestamp: number;
  attempts?: number;
}

// Global cache for all media (thumbnails, videos, audio)
export const globalMediaCache = new Map<string, MediaCacheEntry>();

// Context for accessing the cache
const MediaCacheContext = createContext({
  cache: globalMediaCache,
  setMediaLoaded: (key: string) => {
    globalMediaCache.set(key, {
      loaded: true,
      error: false,
      timestamp: Date.now(),
      attempts: 0, // Reset attempts on successful load
    });
  },
  setMediaError: (key: string) => {
    const existing = globalMediaCache.get(key);
    globalMediaCache.set(key, {
      loaded: false,
      error: true,
      timestamp: Date.now(),
      attempts: (existing?.attempts || 0) + 1,
    });
  },
  isMediaLoaded: (key: string): boolean => {
    const entry = globalMediaCache.get(key);
    return entry?.loaded === true;
  },
  isMediaError: (key: string): boolean => {
    const entry = globalMediaCache.get(key);
    return entry?.error === true;
  },
  getMediaStatus: (key: string): MediaCacheEntry | undefined => {
    return globalMediaCache.get(key);
  },
  // Modified clearMediaError to reset error state and attempts rather than deleting
  clearMediaError: (key: string) => {
    const entry = globalMediaCache.get(key);
    if (entry) {
      globalMediaCache.set(key, {
        ...entry,
        error: false,
        attempts: 0, // Reset attempts when clearing the error
      });
    }
  },
});

export const MediaCacheProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  return (
    <MediaCacheContext.Provider
      value={{
        cache: globalMediaCache,
        setMediaLoaded: (key: string) => {
          globalMediaCache.set(key, {
            loaded: true,
            error: false,
            timestamp: Date.now(),
            attempts: 0,
          });
        },
        setMediaError: (key: string) => {
          const existing = globalMediaCache.get(key);
          globalMediaCache.set(key, {
            loaded: false,
            error: true,
            timestamp: Date.now(),
            attempts: (existing?.attempts || 0) + 1,
          });
        },
        isMediaLoaded: (key: string): boolean => {
          const entry = globalMediaCache.get(key);
          return entry?.loaded === true;
        },
        isMediaError: (key: string): boolean => {
          const entry = globalMediaCache.get(key);
          return entry?.error === true;
        },
        getMediaStatus: (key: string): MediaCacheEntry | undefined => {
          return globalMediaCache.get(key);
        },
        clearMediaError: (key: string) => {
          const entry = globalMediaCache.get(key);
          if (entry) {
            globalMediaCache.set(key, {
              ...entry,
              error: false,
              attempts: 0,
            });
          }
        },
      }}
    >
      {children}
    </MediaCacheContext.Provider>
  );
};

export const useMediaCache = () => {
  const context = useContext(MediaCacheContext);
  if (!context) {
    throw new Error("useMediaCache must be used within MediaCacheProvider");
  }
  return context;
};
