import { useEffect, useRef, useState } from "react";
import type { Object } from "@prisma/client";
import { AudioLines, Lock } from "lucide-react";
import { useMediaCache } from "~/contexts/MediaCacheContext";

export function Thumbnail({
  object,
  endpoint,
  onClick,
  isRow,
  height,
  width,
  isAdmin = false,
  shouldLoad = false,
  onError,
}: {
  object: Object;
  endpoint: string;
  onClick?: () => void;
  isRow?: boolean;
  height?: number;
  width?: number;
  isAdmin?: boolean;
  shouldLoad?: boolean;
  onError?: () => void;
}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isTallMedia, setIsTallMedia] = useState(false);
  const [retryTimestamp, setRetryTimestamp] = useState(0);
  const elementRef = useRef<HTMLDivElement>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Use global media cache
  const mediaCache = useMediaCache();

  // Generate cache keys for this object
  const mainMediaKey = `${object.s3fileKey}`;
  const posterKey = object.posterKey ? `${object.posterKey}` : null;
  const currentMediaKey = posterKey || mainMediaKey;

  // Check if media is already cached on mount and when keys change
  useEffect(() => {
    const status = mediaCache.getMediaStatus(currentMediaKey);

    if (status === "loaded") {
      setIsLoaded(true);
      setHasError(false);
    } else if (status === "error") {
      const retryCount = mediaCache.getRetryCount(currentMediaKey);

      // If we've exceeded max retries, set permanent error
      if (retryCount >= 5) {
        setHasError(true);
        setIsLoaded(false);
      } else if (mediaCache.canRetry(currentMediaKey)) {
        // If we can retry now, force a retry by clearing error state
        setHasError(false);
        setRetryTimestamp(Date.now());
      } else {
        // Set temporary error and schedule retry
        setHasError(true);

        // Calculate next retry time with exponential backoff
        const delay = Math.min(1000 * Math.pow(2, retryCount - 1), 30000);

        // Clear any existing timeout
        if (retryTimeoutRef.current) {
          clearTimeout(retryTimeoutRef.current);
        }

        // Schedule retry
        retryTimeoutRef.current = setTimeout(() => {
          if (mediaCache.canRetry(currentMediaKey)) {
            setHasError(false);
            setRetryTimestamp(Date.now());
          }
        }, delay);
      }
    }
  }, [currentMediaKey, mediaCache]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  // Function to determine if media is extremely tall/vertical (aspect ratio < 0.6)
  const isExtremelyTall = (width: number, height: number) => {
    return width / height < 0.6;
  };

  // Handle media load event
  const handleMediaLoaded = (mediaKey: string) => {
    // Clear any retry timeout
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }

    // Mark as loaded in global cache
    mediaCache.markMediaAsLoaded(mediaKey);

    setIsLoaded(true);
    setHasError(false);
  };

  // Handle media load error
  const handleError = (mediaKey: string) => {
    // Only process error if not already loaded elsewhere
    if (mediaCache.getMediaStatus(mediaKey) !== "loaded") {
      const retryCount = mediaCache.getRetryCount(mediaKey);

      // Mark as error in cache (this increments retry count)
      mediaCache.markMediaAsError(mediaKey);

      // Check if we've exceeded max retries
      if (retryCount >= 4) {
        // 4 because markMediaAsError will increment to 5
        setHasError(true);

        // Call the parent component's error handler if provided
        if (onError) {
          onError();
        }
      } else {
        // Set temporary error and let the useEffect schedule retry
        setHasError(true);
      }
    }
  };

  // Determine if we should render content
  const shouldRenderContent = shouldLoad && !hasError;

  // Check if media is already loading elsewhere
  const isAlreadyLoading = mediaCache.isMediaLoading(currentMediaKey);

  // Mark as loading when we start loading (but not if already loaded or loading)
  useEffect(() => {
    if (
      shouldRenderContent &&
      !isLoaded &&
      !isAlreadyLoading &&
      mediaCache.getMediaStatus(currentMediaKey) === "idle"
    ) {
      mediaCache.markMediaAsLoading(currentMediaKey);
    }
  }, [
    shouldRenderContent,
    isLoaded,
    isAlreadyLoading,
    currentMediaKey,
    mediaCache,
  ]);

  // Calculate container classes based on layout type
  const containerClasses = isRow
    ? `${isAdmin ? "w-16 h-16" : "w-24 h-24"} flex-shrink-0`
    : "w-full h-full flex items-center justify-center";

  // Calculate image/video container classes based on layout type
  const mediaContainerClasses = isRow
    ? "w-full h-full flex items-center justify-center overflow-hidden relative"
    : "aspect-video w-full h-full flex items-center justify-center overflow-hidden relative";

  // Add timestamp to force reload on retry
  const getMediaSrc = (src: string) => {
    if (retryTimestamp && hasError === false) {
      return `${src}?retry=${retryTimestamp}`;
    }
    return src;
  };

  return (
    <div ref={elementRef} className={containerClasses} onClick={onClick}>
      {shouldRenderContent ? (
        <>
          {object.posterKey ? (
            <div className={mediaContainerClasses}>
              <div
                className={`w-full h-full relative ${isTallMedia ? "bg-black flex items-center justify-center" : ""}`}
              >
                <img
                  src={getMediaSrc(endpoint + object.posterKey)}
                  height={height}
                  width={width}
                  className={`
                    ${
                      isTallMedia
                        ? "object-contain max-h-full max-w-full"
                        : "object-cover absolute inset-0 w-full h-full"
                    }
                    ${object.isLocked ? "blur-sm opacity-70" : ""}
                  `}
                  loading="lazy"
                  onLoad={(e) => {
                    const img = e.target as HTMLImageElement;
                    setIsTallMedia(
                      isExtremelyTall(img.naturalWidth, img.naturalHeight)
                    );
                    handleMediaLoaded(posterKey!);
                  }}
                  onError={() => handleError(posterKey!)}
                  alt={object.fileName || "thumbnail"}
                />
                {object.isLocked && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20">
                    <Lock className="text-white w-8 h-8 drop-shadow-md" />
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className={mediaContainerClasses}>
              {object.kind === "AUDIO" ? (
                <div className="w-full h-full flex items-center justify-center">
                  <AudioLines className="text-gray-400 w-12 h-12" />
                  {object.isLocked && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20">
                      <Lock className="text-white w-8 h-8 drop-shadow-md" />
                    </div>
                  )}
                </div>
              ) : object.kind === "PHOTO" ? (
                <div
                  className={`w-full h-full relative ${isTallMedia ? "bg-black flex items-center justify-center" : ""}`}
                >
                  <img
                    src={getMediaSrc(endpoint + object.s3fileKey)}
                    loading="lazy"
                    width={width}
                    className={`
                      ${
                        isTallMedia
                          ? "object-contain max-h-full max-w-full"
                          : "object-cover absolute inset-0 w-full h-full"
                      }
                      ${object.isLocked ? "blur-sm opacity-70" : ""}
                    `}
                    onLoad={(e) => {
                      const img = e.target as HTMLImageElement;
                      setIsTallMedia(
                        isExtremelyTall(img.naturalWidth, img.naturalHeight)
                      );
                      handleMediaLoaded(mainMediaKey);
                    }}
                    onError={() => handleError(mainMediaKey)}
                    alt={object.fileName || "photo"}
                  />
                  {object.isLocked && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20">
                      <Lock className="text-white w-8 h-8 drop-shadow-md" />
                    </div>
                  )}
                </div>
              ) : (
                // Video thumbnail - use poster frame or just first frame
                <div
                  className={`w-full h-full relative ${isTallMedia ? "bg-black flex items-center justify-center" : ""}`}
                >
                  <video
                    preload="metadata"
                    src={getMediaSrc(endpoint + object.s3fileKey + "#t=0.1")}
                    className={`
                      ${
                        isTallMedia
                          ? "object-contain max-h-full max-w-full"
                          : "object-cover absolute inset-0 w-full h-full"
                      }
                      ${object.isLocked ? "blur-sm opacity-70" : ""}
                    `}
                    poster={
                      object.posterKey
                        ? getMediaSrc(endpoint + object.posterKey)
                        : undefined
                    }
                    muted
                    disablePictureInPicture
                    disableRemotePlayback
                    onError={() => handleError(mainMediaKey)}
                    onLoadedMetadata={(e) => {
                      const video = e.target as HTMLVideoElement;
                      setIsTallMedia(
                        isExtremelyTall(video.videoWidth, video.videoHeight)
                      );
                      handleMediaLoaded(mainMediaKey);
                    }}
                  />
                  {object.isLocked && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20">
                      <Lock className="text-white w-8 h-8 drop-shadow-md" />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <div className={mediaContainerClasses}>
          {hasError && mediaCache.getRetryCount(currentMediaKey) >= 5 ? (
            <div className="text-gray-400 text-xs text-center">
              <span className="block">Failed</span>
              <span className="block text-[10px]">(Max retries)</span>
            </div>
          ) : hasError ? (
            <div className="text-gray-400 text-xs text-center">
              <span className="block">Error</span>
              <span className="block text-[10px]">
                Retry {mediaCache.getRetryCount(currentMediaKey)}/5
              </span>
            </div>
          ) : (
            <div className="w-8 h-8 rounded-full border-2 border-gray-600 border-t-gray-400 animate-spin"></div>
          )}
          {object.isLocked && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20">
              <Lock className="text-white w-8 h-8 drop-shadow-md" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
