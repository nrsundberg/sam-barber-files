import React, { createContext, useContext } from "react";

interface MediaCacheEntry {
  loaded: boolean;
  loading: boolean; // Add loading state
  error: boolean;
  timestamp: number;
  attempts?: number;
}

// Global cache for all media (thumbnails, videos, audio)
export const globalMediaCache = new Map<string, MediaCacheEntry>();

// Context for accessing the cache
const MediaCacheContext = createContext({
  cache: globalMediaCache,
  setMediaLoading: (key: string) => {
    globalMediaCache.set(key, {
      loaded: false,
      loading: true,
      error: false,
      timestamp: Date.now(),
    });
  },
  setMediaLoaded: (key: string) => {
    globalMediaCache.set(key, {
      loaded: true,
      loading: false,
      error: false,
      timestamp: Date.now(),
    });
  },
  setMediaError: (key: string) => {
    const existing = globalMediaCache.get(key);
    globalMediaCache.set(key, {
      loaded: false,
      loading: false,
      error: true,
      timestamp: Date.now(),
      attempts: (existing?.attempts || 0) + 1,
    });
  },
  isMediaLoaded: (key: string): boolean => {
    const entry = globalMediaCache.get(key);
    return entry?.loaded === true;
  },
  isMediaLoading: (key: string): boolean => {
    const entry = globalMediaCache.get(key);
    return entry?.loading === true;
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
    if (entry?.error) {
      globalMediaCache.delete(key);
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
        setMediaLoading: (key: string) => {
          globalMediaCache.set(key, {
            loaded: false,
            loading: true,
            error: false,
            timestamp: Date.now(),
          });
        },
        setMediaLoaded: (key: string) => {
          globalMediaCache.set(key, {
            loaded: true,
            loading: false,
            error: false,
            timestamp: Date.now(),
          });
        },
        setMediaError: (key: string) => {
          const existing = globalMediaCache.get(key);
          globalMediaCache.set(key, {
            loaded: false,
            loading: false,
            error: true,
            timestamp: Date.now(),
            attempts: (existing?.attempts || 0) + 1,
          });
        },
        isMediaLoaded: (key: string): boolean => {
          const entry = globalMediaCache.get(key);
          return entry?.loaded === true;
        },
        isMediaLoading: (key: string): boolean => {
          const entry = globalMediaCache.get(key);
          return entry?.loading === true;
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
          if (entry?.error) {
            globalMediaCache.delete(key);
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
