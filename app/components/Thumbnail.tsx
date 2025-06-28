import { useEffect, useRef, useState } from "react";
import type { Object } from "@prisma/client";
import { AudioLines, Lock } from "lucide-react";

// Global cache for loaded thumbnails
const thumbnailCache = new Map<string, { url: string; loaded: boolean }>();

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
  const elementRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef<boolean>(false);

  // Generate cache keys for this object
  const thumbnailKey = object.posterKey || object.s3fileKey;
  const cacheKey = `${endpoint}${thumbnailKey}`;

  // Check if this thumbnail is already in cache
  const isInCache =
    thumbnailCache.has(cacheKey) && thumbnailCache.get(cacheKey)?.loaded;

  // Initialize from cache if available
  useEffect(() => {
    if (isInCache) {
      setIsLoaded(true);
      setHasError(false);
    }
  }, [isInCache]);

  // Function to determine if media is extremely tall/vertical
  const isExtremelyTall = (width: number, height: number) => {
    return width / height < 0.6;
  };

  // Handle successful load
  const handleLoad = (
    e: React.SyntheticEvent<HTMLImageElement | HTMLVideoElement>
  ) => {
    // Prevent duplicate processing
    if (loadingRef.current) return;
    loadingRef.current = true;

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

    // Cache the successful load
    thumbnailCache.set(cacheKey, { url: cacheKey, loaded: true });

    loadingRef.current = false;
  };

  // Handle load error
  const handleError = () => {
    // Only handle error once
    if (hasError) return;

    setHasError(true);
    setIsLoaded(false);

    // Remove from cache on error
    thumbnailCache.delete(cacheKey);

    // Call parent error handler
    if (onError) {
      onError();
    }
  };

  // Determine what to render
  const shouldRenderContent = shouldLoad && !hasError;

  // Calculate container classes
  const containerClasses = isRow
    ? `${isAdmin ? "w-16 h-16" : "w-24 h-24"} flex-shrink-0`
    : "w-full h-full flex items-center justify-center";

  const mediaContainerClasses = isRow
    ? "w-full h-full flex items-center justify-center overflow-hidden relative"
    : "aspect-video w-full h-full flex items-center justify-center overflow-hidden relative";

  // Generate the media URL only once
  const mediaUrl = shouldRenderContent ? endpoint + thumbnailKey : "";
  const posterUrl =
    object.posterKey && shouldRenderContent ? endpoint + object.posterKey : "";

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
                  src={posterUrl}
                  height={height}
                  width={width}
                  className={`
                    ${isTallMedia ? "object-contain max-h-full max-w-full" : "object-cover absolute inset-0 w-full h-full"}
                    ${object.isLocked ? "blur-sm opacity-70" : ""}
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
                    src={mediaUrl}
                    loading="lazy"
                    width={width}
                    className={`
                      ${isTallMedia ? "object-contain max-h-full max-w-full" : "object-cover absolute inset-0 w-full h-full"}
                      ${object.isLocked ? "blur-sm opacity-70" : ""}
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
                  <video
                    preload="none"
                    poster={posterUrl || undefined}
                    className={`
                      ${isTallMedia ? "object-contain max-h-full max-w-full" : "object-cover absolute inset-0 w-full h-full"}
                      ${object.isLocked ? "blur-sm opacity-70" : ""}
                    `}
                    muted
                    disablePictureInPicture
                    disableRemotePlayback
                    onLoadedMetadata={handleLoad}
                    onError={handleError}
                  >
                    <source src={mediaUrl + "#t=0.1"} />
                  </video>
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
      {(!shouldRenderContent || hasError) && (
        <div className={mediaContainerClasses}>
          {hasError ? (
            <div className="text-gray-400 text-xs text-center">
              <span className="block">Error</span>
              <span className="block">Loading</span>
            </div>
          ) : (
            <div className="w-8 h-8 rounded-full border-2 border-gray-600 border-t-gray-400 animate-spin"></div>
          )}
        </div>
      )}
    </div>
  );
}
