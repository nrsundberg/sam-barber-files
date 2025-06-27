import {
  useEffect,
  useRef,
  useState,
  type SyntheticEvent,
  useCallback,
} from "react";
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
  const [hasAttemptedLoad, setHasAttemptedLoad] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isTallMedia, setIsTallMedia] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef<boolean>(false);

  // Use the global media cache
  const {
    isLoaded: isMediaLoaded,
    shouldLoad: shouldMediaLoad,
    markLoading,
    markLoaded,
    markError,
    hasMaxRetries,
  } = useMediaCache();
  const mediaCacheKey = useRef(
    object.posterKey
      ? endpoint + object.posterKey
      : object.kind === "PHOTO" || object.kind === "VIDEO"
        ? endpoint + object.s3fileKey
        : null
  ).current;

  // Memoize media URLs to prevent re-renders
  const mediaUrls = useRef({
    poster: object.posterKey ? endpoint + object.posterKey : undefined,
    main: endpoint + object.s3fileKey,
  }).current;

  // Check global cache on mount and when shouldLoad changes
  useEffect(() => {
    if (
      mediaCacheKey &&
      shouldLoad &&
      !hasAttemptedLoad &&
      !loadingRef.current
    ) {
      // Check if already loaded in global cache
      if (isMediaLoaded(mediaCacheKey)) {
        setIsLoaded(true);
        setHasAttemptedLoad(true);
        setHasError(false);
        return;
      }

      // Check if we've exceeded max retries
      if (hasMaxRetries(mediaCacheKey)) {
        setHasError(true);
        setHasAttemptedLoad(true);
        return;
      }

      // Check if we should attempt to load this media
      if (!shouldMediaLoad(mediaCacheKey)) {
        return; // Don't load if it's still in cooldown or loading
      }

      // Mark as attempted and start loading
      setHasAttemptedLoad(true);
      markLoading(mediaCacheKey);
    }
  }, [
    mediaCacheKey,
    shouldLoad,
    hasAttemptedLoad,
    isMediaLoaded,
    hasMaxRetries,
    shouldMediaLoad,
    markLoading,
  ]);

  // Setup intersection observer for visibility detection
  useEffect(() => {
    if (!elementRef.current || !shouldLoad || isLoaded || hasAttemptedLoad)
      return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loadingRef.current) {
          setIsVisible(true);
          setHasAttemptedLoad(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(elementRef.current);
    return () => observer.disconnect();
  }, [shouldLoad, isLoaded, hasAttemptedLoad]);

  // Function to determine if media is extremely tall/vertical
  const isExtremelyTall = useCallback((width: number, height: number) => {
    return width / height < 0.6;
  }, []);

  // Handle successful media load - memoized to prevent re-creation
  const handleLoad = useCallback(
    (e: SyntheticEvent<HTMLImageElement | HTMLVideoElement>) => {
      // Prevent duplicate handling
      if (loadingRef.current) return;
      loadingRef.current = true;

      const target = e.target as HTMLImageElement | HTMLVideoElement;

      if (target instanceof HTMLImageElement) {
        setIsTallMedia(
          isExtremelyTall(target.naturalWidth, target.naturalHeight)
        );
      } else if (target instanceof HTMLVideoElement) {
        setIsTallMedia(isExtremelyTall(target.videoWidth, target.videoHeight));
      }

      setIsLoaded(true);
      setHasError(false);

      // Update global cache
      if (mediaCacheKey) {
        markLoaded(mediaCacheKey);
      }

      loadingRef.current = false;
    },
    [mediaCacheKey, isExtremelyTall, markLoaded]
  );

  // Handle media load error - memoized to prevent re-creation
  const handleErrorCallback = useCallback(() => {
    if (loadingRef.current) return;

    setHasError(true);

    // Update global cache with error state
    if (mediaCacheKey) {
      markError(mediaCacheKey);
    }

    if (onError) {
      onError();
    }
  }, [mediaCacheKey, onError, markError]);

  // Determine if we should render content - now considers max retries
  const shouldRenderContent =
    shouldLoad &&
    hasAttemptedLoad &&
    !hasError &&
    !hasMaxRetries(mediaCacheKey || "");

  // Calculate container classes - memoized
  const containerClasses = useRef(
    isRow
      ? `${isAdmin ? "w-16 h-16" : "w-24 h-24"} flex-shrink-0`
      : "w-full h-full flex items-center justify-center"
  ).current;

  const mediaContainerClasses = useRef(
    isRow
      ? "w-full h-full flex items-center justify-center overflow-hidden relative"
      : "aspect-video w-full h-full flex items-center justify-center overflow-hidden relative"
  ).current;

  return (
    <div ref={elementRef} className={containerClasses} onClick={onClick}>
      {shouldRenderContent && (
        <>
          {object.posterKey ? (
            <div className={mediaContainerClasses}>
              <div
                className={`w-full h-full relative ${isTallMedia ? "bg-black flex items-center justify-center" : ""}`}
              >
                <img
                  src={mediaUrls.poster}
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
                  onLoad={handleLoad}
                  onError={handleErrorCallback}
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
                    src={mediaUrls.main}
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
                    onLoad={handleLoad}
                    onError={handleErrorCallback}
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
                  <video
                    preload="metadata"
                    src={mediaUrls.main + "#t=0.1"}
                    className={`
                      ${
                        isTallMedia
                          ? "object-contain max-h-full max-w-full"
                          : "object-cover absolute inset-0 w-full h-full"
                      }
                      ${object.isLocked ? "blur-sm opacity-70" : ""}
                    `}
                    poster={mediaUrls.poster}
                    muted
                    disablePictureInPicture
                    disableRemotePlayback
                    onError={handleErrorCallback}
                    onLoadedMetadata={handleLoad}
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
      )}
      {(!shouldRenderContent ||
        hasError ||
        hasMaxRetries(mediaCacheKey || "")) && (
        <div className={mediaContainerClasses}>
          {hasError || hasMaxRetries(mediaCacheKey || "") ? (
            <div className="text-gray-400 text-xs text-center">
              <span className="block">Failed</span>
              <span className="block">to Load</span>
            </div>
          ) : (
            <div className="w-8 h-8 rounded-full border-2 border-gray-600 border-t-gray-400 animate-spin"></div>
          )}
          {object.isLocked && shouldRenderContent && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20">
              <Lock className="text-white w-8 h-8 drop-shadow-md" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
