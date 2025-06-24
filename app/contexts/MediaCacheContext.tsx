import React, { createContext, useContext, useRef } from "react";

interface MediaCacheEntry {
  status: "loading" | "loaded" | "error";
  retryCount: number;
  lastAttempt: number;
}

interface MediaCacheContextType {
  isMediaLoaded: (key: string) => boolean;
  markMediaAsLoaded: (key: string) => void;
  isMediaLoading: (key: string) => boolean;
  markMediaAsLoading: (key: string) => void;
  markMediaAsError: (key: string) => void;
  getMediaStatus: (key: string) => "idle" | "loading" | "loaded" | "error";
  getRetryCount: (key: string) => number;
  canRetry: (key: string) => boolean;
  clearError: (key: string) => void;
}

const MediaCacheContext = createContext<MediaCacheContextType | null>(null);

export const useMediaCache = () => {
  const context = useContext(MediaCacheContext);
  if (!context) {
    throw new Error("useMediaCache must be used within MediaCacheProvider");
  }
  return context;
};

// Global cache that persists across component remounts
const globalMediaCache = new Map<string, MediaCacheEntry>();

// Maximum retry attempts
const MAX_RETRY_ATTEMPTS = 5;
// Minimum time between retries (in milliseconds)
const MIN_RETRY_DELAY = 1000;

export const MediaCacheProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  // Use ref to ensure the cache persists across re-renders
  const cacheRef = useRef(globalMediaCache);

  const isMediaLoaded = (key: string): boolean => {
    const entry = cacheRef.current.get(key);
    return entry?.status === "loaded";
  };

  const isMediaLoading = (key: string): boolean => {
    const entry = cacheRef.current.get(key);
    return entry?.status === "loading";
  };

  const markMediaAsLoaded = (key: string) => {
    cacheRef.current.set(key, {
      status: "loaded",
      retryCount: 0,
      lastAttempt: Date.now(),
    });
  };

  const markMediaAsLoading = (key: string) => {
    const existing = cacheRef.current.get(key);
    cacheRef.current.set(key, {
      status: "loading",
      retryCount: existing?.retryCount || 0,
      lastAttempt: Date.now(),
    });
  };

  const markMediaAsError = (key: string) => {
    const existing = cacheRef.current.get(key);
    const retryCount = (existing?.retryCount || 0) + 1;

    cacheRef.current.set(key, {
      status: "error",
      retryCount,
      lastAttempt: Date.now(),
    });
  };

  const getMediaStatus = (
    key: string
  ): "idle" | "loading" | "loaded" | "error" => {
    const entry = cacheRef.current.get(key);
    return entry?.status || "idle";
  };

  const getRetryCount = (key: string): number => {
    const entry = cacheRef.current.get(key);
    return entry?.retryCount || 0;
  };

  const canRetry = (key: string): boolean => {
    const entry = cacheRef.current.get(key);
    if (!entry || entry.status !== "error") return true;

    // Check if we've exceeded max retries
    if (entry.retryCount >= MAX_RETRY_ATTEMPTS) return false;

    // Check if enough time has passed since last attempt (exponential backoff)
    const timeSinceLastAttempt = Date.now() - entry.lastAttempt;
    const requiredDelay = Math.min(
      MIN_RETRY_DELAY * Math.pow(2, entry.retryCount - 1),
      30000
    );

    return timeSinceLastAttempt >= requiredDelay;
  };

  const clearError = (key: string) => {
    cacheRef.current.delete(key);
  };

  const value = {
    isMediaLoaded,
    markMediaAsLoaded,
    isMediaLoading,
    markMediaAsLoading,
    markMediaAsError,
    getMediaStatus,
    getRetryCount,
    canRetry,
    clearError,
  };

  return (
    <MediaCacheContext.Provider value={value}>
      {children}
    </MediaCacheContext.Provider>
  );
};
