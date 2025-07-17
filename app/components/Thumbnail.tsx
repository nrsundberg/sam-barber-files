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
  const mediaCache = useMediaCache();
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isTallMedia, setIsTallMedia] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);

  // New state to track if we've initiated a load attempt for the current media
  const [hasAttemptedLoad, setHasAttemptedLoad] = useState(false);

  // For audio files, we don't need to load images
  const isAudioFile = object.kind === "AUDIO";

  // Generate cache keys for this object
  const thumbnailKey = object.posterKey || object.s3fileKey;
  const cacheKey = `${endpoint}${thumbnailKey}`;

  // Check cache status (skip for audio files)
  const cacheStatus = isAudioFile
    ? undefined
    : mediaCache.getMediaStatus(cacheKey);
  const isInCache = isAudioFile ? true : cacheStatus?.loaded === true;
  const isCacheError = isAudioFile ? false : cacheStatus?.error === true;
  const cacheAttempts = cacheStatus?.attempts || 0;

  // Initialize from cache
  useEffect(() => {
    if (isAudioFile || isInCache) {
      setIsLoaded(true);
      setHasError(false);
      setHasAttemptedLoad(true); // Mark as attempted if already in cache
    } else if (isCacheError) {
      setHasError(true);
      setIsLoaded(false);
      setHasAttemptedLoad(true); // Mark as attempted even on error limit
    } else {
      // Reset attempted load state if not in cache and not permanently errored
      setHasAttemptedLoad(false);
    }
  }, [isAudioFile, isInCache, isCacheError, cacheAttempts]);

  // Setup intersection observer for lazy loading (skip for audio)
  useEffect(() => {
    if (!elementRef.current || !shouldLoad || isInCache || isAudioFile) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: "100px" } // Start loading 100px before visible
    );

    observer.observe(elementRef.current);
    return () => observer.disconnect();
  }, [shouldLoad, isInCache, isAudioFile]);

  // Function to determine if media is extremely tall/vertical
  const isExtremelyTall = (width: number, height: number) => {
    return width / height < 0.6;
  };

  // Handle successful load
  const handleLoad = (
    e: React.SyntheticEvent<HTMLImageElement | HTMLVideoElement>
  ) => {
    const element = e.target as HTMLImageElement | HTMLVideoElement;

    if (element instanceof HTMLImageElement) {
      setIsTallMedia(
        isExtremelyTall(element.naturalWidth, element.naturalHeight)
      );
    } else if (element instanceof HTMLVideoElement) {
      setIsTallMedia(isExtremelyTall(element.videoWidth, element.videoHeight));
    }

    setIsLoaded(true);
    setHasError(false);
    setHasAttemptedLoad(true); // Successfully loaded, mark as attempted

    // Update global cache
    mediaCache.setMediaLoaded(cacheKey);
  };

  // Handle load error
  const handleError = () => {
    setHasError(true);
    setIsLoaded(false);
    setHasAttemptedLoad(true); // Mark as attempted even on error

    // Update global cache
    mediaCache.setMediaError(cacheKey);

    // Call parent error handler
    if (onError) {
      onError();
    }
  };

  // Determine what to render and when to trigger a load attempt
  const shouldRenderMediaContent =
    isAudioFile || (shouldLoad && (isVisible || isInCache)) || isInCache;
  const shouldShowError = !isAudioFile && hasError;

  // Generate the media URLs
  const mediaUrl = endpoint + thumbnailKey;
  const posterUrl = object.posterKey ? endpoint + object.posterKey : undefined;

  // Only set src if we need to actually attempt a load and haven't already
  const mediaSrc =
    shouldRenderMediaContent &&
    !shouldShowError &&
    !hasAttemptedLoad &&
    !isInCache
      ? mediaUrl
      : undefined;
  const posterSrc =
    shouldRenderMediaContent &&
    !shouldShowError &&
    !hasAttemptedLoad &&
    !isInCache &&
    object.posterKey
      ? posterUrl
      : undefined;

  // Calculate container classes
  const containerClasses = isRow
    ? `${isAdmin ? "w-16 h-16" : "w-24 h-24"} flex-shrink-0 relative`
    : "w-full h-full flex items-center justify-center relative";

  const mediaContainerClasses = isRow
    ? "w-full h-full flex items-center justify-center overflow-hidden relative"
    : "aspect-video w-full h-full flex items-center justify-center overflow-hidden relative";

  return (
    <div ref={elementRef} className={containerClasses} onClick={onClick}>
      {shouldRenderMediaContent && !shouldShowError && (
        <>
          {object.posterKey ? (
            <div className={mediaContainerClasses}>
              <div
                className={`w-full h-full relative ${isTallMedia ? "bg-black flex items-center justify-center" : ""}`}
              >
                <img
                  src={isInCache ? posterUrl : posterSrc}
                  height={height}
                  width={width}
                  className={`
                    ${isTallMedia ? "object-contain max-h-full max-w-full" : "object-cover absolute inset-0 w-full h-full"}
                    ${object.isLocked ? "blur-sm opacity-70" : ""}
                    ${!isLoaded && !isInCache ? "opacity-0" : "opacity-100"}
                    transition-opacity duration-300
                  `}
                  loading="lazy"
                  onLoad={handleLoad}
                  onError={handleError}
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
                    src={isInCache ? mediaUrl : mediaSrc}
                    loading="lazy"
                    width={width}
                    height={height}
                    className={`
                      ${isTallMedia ? "object-contain max-h-full max-w-full" : "object-cover absolute inset-0 w-full h-full"}
                      ${object.isLocked ? "blur-sm opacity-40" : ""}
                      ${!isLoaded && !isInCache ? "opacity-0" : "opacity-100"}
                      transition-opacity duration-300
                    `}
                    onLoad={handleLoad}
                    onError={handleError}
                    alt={object.fileName || "photo"}
                  />
                  {object.isLocked && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20">
                      <Lock className="text-white w-8 h-8 drop-shadow-md" />
                    </div>
                  )}
                </div>
              ) : (
                // Video thumbnail
                <div
                  className={`w-full h-full relative ${isTallMedia ? "bg-black flex items-center justify-center" : ""}`}
                >
                  {object.posterKey ? (
                    <img
                      src={isInCache ? posterUrl : posterSrc}
                      loading="lazy"
                      width={width}
                      height={height}
                      className={`
                        ${isTallMedia ? "object-contain max-h-full max-w-full" : "object-cover absolute inset-0 w-full h-full"}
                        ${object.isLocked ? "blur-sm opacity-40" : ""}
                        ${!isLoaded && !isInCache ? "opacity-0" : "opacity-100"}
                        transition-opacity duration-300
                      `}
                      onLoad={handleLoad}
                      onError={handleError}
                      alt={object.fileName || "video thumbnail"}
                    />
                  ) : (
                    <video
                      preload="metadata"
                      className={`
                        ${isTallMedia ? "object-contain max-h-full max-w-full" : "object-cover absolute inset-0 w-full h-full"}
                        ${object.isLocked ? "blur-sm opacity-40" : ""}
                        ${!isLoaded && !isInCache ? "opacity-0" : "opacity-100"}
                        transition-opacity duration-300
                      `}
                      muted
                      disablePictureInPicture
                      disableRemotePlayback
                      onLoadedMetadata={handleLoad}
                      onError={handleError}
                      src={isInCache ? mediaUrl : mediaSrc}
                    ></video>
                  )}
                  {object.isLocked && (
                    <div className="absolute inset-0 flex items-center justify-center bg-opacity-20">
                      <Lock className="text-white w-8 h-8 drop-shadow-md" />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {!isAudioFile &&
        (!isLoaded || shouldShowError) &&
        shouldRenderMediaContent && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-transparent">
            {shouldShowError ? (
              <div className="text-gray-400 text-xs text-center">
                <span className="block">Error</span>
                <span className="block">Loading</span>
              </div>
            ) : (
              <div className="w-8 h-8 rounded-full border-2 border-gray-600 border-t-gray-400 animate-spin" />
            )}
          </div>
        )}
    </div>
  );
}
