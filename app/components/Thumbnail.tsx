import { useEffect, useRef, useState } from "react";
import type { Object } from "@prisma/client";
import { AudioLines, Lock } from "lucide-react";

export function Thumbnail({
  object,
  endpoint,
  onClick,
  isRow,
  height,
  width,
  isAdmin = false,
  shouldLoad = false, // Control lazy loading
  onError, // Callback for error handling
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

  // Keep track of error state specifically for this thumbnail
  const errorStateRef = useRef<boolean>(false);

  // Setup intersection observer for visibility detection
  useEffect(() => {
    if (!elementRef.current || !shouldLoad) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsVisible(true);
          setHasAttemptedLoad(true);
          observer.disconnect(); // Once visible, stop observing
        }
      },
      { threshold: 0.1 }, // Start loading when 10% visible
    );

    observer.observe(elementRef.current);
    return () => observer.disconnect();
  }, [shouldLoad]);

  // Function to determine if media is extremely tall/vertical (aspect ratio < 0.6)
  const isExtremelyTall = (width: number, height: number) => {
    return width / height < 0.6;
  };

  // Set hasAttemptedLoad directly if shouldLoad is true
  useEffect(() => {
    if (shouldLoad && !hasAttemptedLoad) {
      setHasAttemptedLoad(true);
    }
  }, [shouldLoad, hasAttemptedLoad]);

  // Reset error state when shouldLoad changes from false to true
  // This is a retry mechanism - when parent decides this item should try loading again
  useEffect(() => {
    if (shouldLoad && errorStateRef.current) {
      setHasError(false);
      errorStateRef.current = false;
    }
  }, [shouldLoad]);

  // Render actual content when shouldLoad is true and element has attempted to load
  const shouldRenderContent = shouldLoad && hasAttemptedLoad && !hasError;

  // Handle media load error
  const handleError = () => {
    // Set local error state
    setHasError(true);
    errorStateRef.current = true;

    // Call the parent component's error handler if provided
    // This should only be called once per error
    if (onError) {
      onError();
    }
  };

  // Calculate container classes based on layout type
  const containerClasses = isRow
    ? `${isAdmin ? "w-16 h-16" : "w-24 h-24"} flex-shrink-0`
    : "w-full h-full flex items-center justify-center";

  // Calculate image/video container classes based on layout type
  // Use the same aspect ratio for all media types
  const mediaContainerClasses = isRow
    ? "w-full h-full flex items-center justify-center overflow-hidden relative"
    : "aspect-video w-full h-full flex items-center justify-center overflow-hidden relative";

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
                  src={endpoint + object.posterKey}
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
                      isExtremelyTall(img.naturalWidth, img.naturalHeight),
                    );
                    setIsLoaded(true);
                    // Clear error state on successful load
                    setHasError(false);
                    errorStateRef.current = false;
                  }}
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
                    src={endpoint + object.s3fileKey}
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
                        isExtremelyTall(img.naturalWidth, img.naturalHeight),
                      );
                      setIsLoaded(true);
                      // Clear error state on successful load
                      setHasError(false);
                      errorStateRef.current = false;
                    }}
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
                // Video thumbnail - use poster frame or just first frame
                <div
                  className={`w-full h-full relative ${isTallMedia ? "bg-black flex items-center justify-center" : ""}`}
                >
                  <video
                    preload="metadata"
                    src={endpoint + object.s3fileKey + "#t=0.1"} // Add timestamp to only load metadata
                    className={`
                      ${
                        isTallMedia
                          ? "object-contain max-h-full max-w-full"
                          : "object-cover absolute inset-0 w-full h-full"
                      }
                      ${object.isLocked ? "blur-sm opacity-70" : ""}
                    `}
                    poster={
                      object.posterKey ? endpoint + object.posterKey : undefined
                    }
                    muted
                    disablePictureInPicture
                    disableRemotePlayback
                    onError={handleError}
                    onLoadedMetadata={(e) => {
                      const video = e.target as HTMLVideoElement;
                      setIsTallMedia(
                        isExtremelyTall(video.videoWidth, video.videoHeight),
                      );
                      setIsLoaded(true);
                      // Clear error state on successful load
                      setHasError(false);
                      errorStateRef.current = false;
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
