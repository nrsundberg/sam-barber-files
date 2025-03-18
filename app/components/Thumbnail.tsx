import { useState, useRef, useEffect } from "react";
import type { Object } from "@prisma/client";
import { AudioLines } from "lucide-react";

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
      { threshold: 0.1 } // Start loading when 10% visible
    );

    observer.observe(elementRef.current);
    return () => observer.disconnect();
  }, [shouldLoad]);

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
  const mediaContainerClasses = isRow
    ? "w-full h-full flex items-center justify-center overflow-hidden"
    : "aspect-video w-full flex items-center justify-center overflow-hidden";

  return (
    <div ref={elementRef} className={containerClasses} onClick={onClick}>
      {shouldRenderContent && (
        <>
          {object.posterKey ? (
            <div className={mediaContainerClasses}>
              <img
                src={endpoint + object.posterKey}
                height={height}
                width={width}
                className="object-contain max-h-full max-w-full"
                loading="lazy"
                onLoad={() => {
                  setIsLoaded(true);
                  // Clear error state on successful load
                  setHasError(false);
                  errorStateRef.current = false;
                }}
                onError={handleError}
                alt={object.fileName || "thumbnail"}
              />
            </div>
          ) : (
            <div className={mediaContainerClasses}>
              {object.kind === "AUDIO" ? (
                <AudioLines className="text-gray-400 w-12 h-12" />
              ) : object.kind === "PHOTO" ? (
                <img
                  src={endpoint + object.s3fileKey}
                  loading="lazy"
                  width={width}
                  className="object-contain max-h-full max-w-full"
                  onLoad={() => {
                    setIsLoaded(true);
                    // Clear error state on successful load
                    setHasError(false);
                    errorStateRef.current = false;
                  }}
                  onError={handleError}
                  alt={object.fileName || "photo"}
                />
              ) : (
                // Video thumbnail - use poster frame or just first frame
                <video
                  preload="metadata"
                  src={endpoint + object.s3fileKey + "#t=0.1"} // Add timestamp to only load metadata
                  className="object-contain max-h-full max-w-full"
                  poster={
                    object.posterKey ? endpoint + object.posterKey : undefined
                  }
                  muted
                  disablePictureInPicture
                  disableRemotePlayback
                  onError={handleError}
                  onLoadedMetadata={() => {
                    setIsLoaded(true);
                    // Clear error state on successful load
                    setHasError(false);
                    errorStateRef.current = false;
                  }}
                />
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
