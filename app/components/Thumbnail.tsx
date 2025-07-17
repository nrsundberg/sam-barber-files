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
}: {
  object: Object;
  endpoint: string;
  onClick?: () => void;
  isRow?: boolean;
  height?: number;
  width?: number;
  isAdmin?: boolean;
}) {
  const mediaCache = useMediaCache();
  const [isTallMedia, setIsTallMedia] = useState(false);

  // For audio files, we don't need to load images
  const isAudioFile = object.kind === "AUDIO";

  // Generate cache keys for this object
  const thumbnailKey = object.posterKey || object.s3fileKey;
  const cacheKey = `${endpoint}${thumbnailKey}`;

  // Check cache status (skip for audio files)
  const cacheStatus = isAudioFile
    ? undefined
    : mediaCache.getMediaStatus(cacheKey);

  const [hasError, setHasError] = useState(
    isAudioFile ? false : cacheStatus?.error === true
  );

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

    setHasError(false);
    // Update global cache
    mediaCache.setMediaLoaded(cacheKey);
  };

  // Determine what to render and when to trigger a load attempt
  const shouldShowError = !isAudioFile && hasError;

  // Generate the media URLs
  const mediaUrl = endpoint + thumbnailKey;
  const posterUrl = object.posterKey ? endpoint + object.posterKey : undefined;

  // Calculate container classes
  const containerClasses = isRow
    ? `${isAdmin ? "w-16 h-16" : "w-24 h-24"} flex-shrink-0 relative`
    : "w-full h-full flex items-center justify-center relative";

  const mediaContainerClasses = isRow
    ? "w-full h-full flex items-center justify-center overflow-hidden relative"
    : "aspect-video w-full h-full flex items-center justify-center overflow-hidden relative";

  return (
    <div className={containerClasses} onClick={onClick}>
      {!shouldShowError && (
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
                    // IDK
                    ${"opacity-100"}
                    transition-opacity duration-300
                  `}
                  loading="lazy"
                  onLoad={handleLoad}
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
                    height={height}
                    className={`
                      ${isTallMedia ? "object-contain max-h-full max-w-full" : "object-cover absolute inset-0 w-full h-full"}
                      ${object.isLocked ? "blur-sm opacity-40" : ""}
                       // IDK
                    ${"opacity-100"}
                      transition-opacity duration-300
                    `}
                    onLoad={handleLoad}
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
                      src={posterUrl}
                      loading="lazy"
                      width={width}
                      height={height}
                      className={`
                        ${isTallMedia ? "object-contain max-h-full max-w-full" : "object-cover absolute inset-0 w-full h-full"}
                        ${object.isLocked ? "blur-sm opacity-40" : ""}
                           // IDK
                    ${"opacity-100"}
                        transition-opacity duration-300
                      `}
                      onLoad={handleLoad}
                      alt={object.fileName || "video thumbnail"}
                    />
                  ) : (
                    <video
                      preload="metadata"
                      className={`
                        ${isTallMedia ? "object-contain max-h-full max-w-full" : "object-cover absolute inset-0 w-full h-full"}
                        ${object.isLocked ? "blur-sm opacity-40" : ""}
                        // IDK
                    ${"opacity-100"}
                        transition-opacity duration-300
                      `}
                      muted
                      disablePictureInPicture
                      disableRemotePlayback
                      onLoadedMetadata={handleLoad}
                      src={mediaUrl}
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

      {!isAudioFile && shouldShowError && (
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
