import { Modal, ModalContent } from "@heroui/react";
import { AudioLines, ChevronDown, ChevronUp, Lock } from "lucide-react";
import { type Object, ObjectKind } from "@prisma/client";
import { formatInTimeZone } from "date-fns-tz";
import { formatBytes } from "~/utils";
import { type UseVideoCarouselReturn } from "./useVideoCarousel";
import { useEffect, useMemo, useRef, useState } from "react";

interface VideoCarouselProps {
  objects: Object[];
  endpoint: string;
  useVideo: UseVideoCarouselReturn;
}

export default function VideoCarousel({
  objects,
  endpoint,
  useVideo,
}: VideoCarouselProps) {
  let {
    isOpen,
    closeModal,
    currentIndex,
    currentObject,
    videoRef,
    containerRef,
    handleNext,
    handlePrev,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleWheel,
    isPlaying,
    setIsPlaying,
    loadedVideos,
    preloadedIndices,
    markVideoAsLoaded,
    markVideoAsError,
  } = useVideo;

  // Create refs for all video elements
  const videoRefs = useRef<(HTMLVideoElement | HTMLAudioElement | null)[]>([]);
  // Track which videos have been loaded in this specific carousel instance
  const [localLoadedKeys, setLocalLoadedKeys] = useState<Set<string>>(
    new Set(),
  );
  // Add state for tracking media load errors
  const [mediaLoadErrors, setMediaLoadErrors] = useState<
    Record<string, { timestamp: number; attempts: number }>
  >({});
  const mediaRetryTimeouts = useRef<Record<string, NodeJS.Timeout>>({});

  // Define which media items should be preloaded based on current position
  const mediaToPreload = useMemo(() => {
    if (currentIndex === -1) return new Set<number>();

    const indices = new Set<number>();
    indices.add(currentIndex); // Current

    if (currentIndex > 0) {
      indices.add(currentIndex - 1); // Previous
    }

    if (currentIndex < objects.length - 1) {
      indices.add(currentIndex + 1); // Next
    }

    return indices;
  }, [currentIndex, objects.length]);

  // Create a memoized mapping of video sources to prevent unnecessary re-renders
  const videoSources = useMemo(() => {
    return objects.map((obj) => ({
      src: endpoint + obj.s3fileKey,
      poster: obj.posterKey ? endpoint + obj.posterKey : undefined,
      key: obj.s3fileKey, // Store the key for tracking purposes
    }));
  }, [objects, endpoint]);

  // Set up ref for current video
  useEffect(() => {
    if (isOpen && currentIndex >= 0 && videoRefs.current[currentIndex]) {
      videoRef.current = videoRefs.current[currentIndex] as any;
    }
  }, [isOpen, currentIndex, videoRef]);

  // Manage play/pause state when switching videos
  useEffect(() => {
    if (isOpen) {
      // Pause all videos except current
      videoRefs.current.forEach((videoElement, index) => {
        if (videoElement && index !== currentIndex) {
          videoElement.pause();
        }
      });

      // If current object is locked, force pause and prevent playing
      if (currentObject?.isLocked) {
        setIsPlaying(false);
        if (videoRef.current) {
          videoRef.current.pause();
        }
      } else {
        // Update current video playing state
        if (videoRef.current) {
          if (isPlaying) {
            videoRef.current.play().catch(() => setIsPlaying(false));
          } else {
            videoRef.current.pause();
          }
        }
      }
    }
  }, [isOpen, currentIndex, isPlaying, setIsPlaying, videoRef, currentObject]);

  // Handle media load event
  const handleMediaLoaded = (index: number, fileKey: string) => {
    if (objects[index]) {
      // Clear any error state for this media
      setMediaLoadErrors((prev) => {
        const updated = { ...prev };
        delete updated[fileKey];
        return updated;
      });

      // Store in local state that we've loaded this media
      setLocalLoadedKeys((prev) => {
        const newSet = new Set(prev);
        newSet.add(fileKey);
        return newSet;
      });

      // Also notify the global tracking system
      markVideoAsLoaded(fileKey, index);
    }
  };

  // Handle media error event
  const handleMediaError = (index: number, fileKey: string) => {
    // Update error tracking
    setMediaLoadErrors((prev) => {
      const now = Date.now();
      const current = prev[fileKey] || { timestamp: now, attempts: 0 };
      return {
        ...prev,
        [fileKey]: {
          timestamp: now,
          attempts: current.attempts + 1,
        },
      };
    });

    // Also notify the global error tracking
    markVideoAsError(fileKey, index);

    // Clear any existing timeout for this item
    if (mediaRetryTimeouts.current[fileKey]) {
      clearTimeout(mediaRetryTimeouts.current[fileKey]);
    }

    // Schedule a retry with exponential backoff
    const attempts = mediaLoadErrors[fileKey]?.attempts || 0;
    const delay = Math.min(1000 * Math.pow(2, attempts), 30000); // Cap at 30 seconds

    if (attempts < 5) {
      // Max 5 retry attempts
      mediaRetryTimeouts.current[fileKey] = setTimeout(() => {
        // Force reload of this specific media
        setLocalLoadedKeys((prev) => {
          const newSet = new Set(prev);
          newSet.delete(fileKey); // Remove from loaded keys to force reload
          return newSet;
        });

        // Remove from error tracking to allow retry
        setMediaLoadErrors((prev) => {
          const updated = { ...prev };
          delete updated[fileKey];
          return updated;
        });
      }, delay);
    }
  };

  // Clean up timeouts when unmounting
  useEffect(() => {
    return () => {
      // Clear all retry timeouts when component unmounts
      Object.values(mediaRetryTimeouts.current).forEach((timeoutId) => {
        clearTimeout(timeoutId);
      });
    };
  }, []);

  // Handler for play/pause that respects locked status
  const handlePlayPause = () => {
    if (currentObject && !currentObject.isLocked) {
      setIsPlaying(!isPlaying);
    }
  };

  // No need to render modal if it's not open
  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={closeModal}
      size={"full"}
      backdrop={"blur"}
      className="bg-transparent shadow-none"
      classNames={{
        wrapper: "flex items-center justify-center h-full w-full",
        base: "w-full h-full max-h-screen flex items-center justify-center",
      }}
    >
      <ModalContent className="min-h-screen flex items-center justify-center">
        <div
          ref={containerRef}
          className="relative h-full flex flex-col items-center justify-center w-full max-h-screen"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onWheel={handleWheel}
        >
          {/* Previous video preview (partially visible) */}
          {currentIndex > 0 && (
            <div
              className="absolute top-0 w-full h-12 md:h-16 flex items-center justify-center cursor-pointer z-10"
              onClick={handlePrev}
            >
              <div className="flex flex-col items-center">
                <ChevronUp size={24} className="text-white" />
                <p className="text-white text-sm truncate max-w-xs">
                  {objects[currentIndex - 1].fileName}
                </p>
              </div>
            </div>
          )}

          {/* Current video */}
          <div className="flex-1 w-full flex flex-col items-center justify-center">
            <div className="relative w-full h-full max-w-screen-xl mx-auto flex flex-col justify-center items-center">
              {/* Mobile: full width, 50% of screen height / Desktop: larger size */}
              <div className="h-[50vh] sm:h-[70vh] w-full flex items-center justify-center bg-black">
                {/* We render all videos but keep most hidden */}
                {objects.map((object, index) => {
                  const shouldRender = true; // Always render but might be hidden
                  const isCurrentMedia = currentIndex === index;
                  const fileKey = object.s3fileKey;
                  const isLocked = object.isLocked;

                  // Use either local or global tracking to determine if this video has been loaded
                  const isLoadedLocally = localLoadedKeys.has(fileKey);
                  const isLoadedGlobally = loadedVideos.has(fileKey);
                  const isIndexPreloaded = preloadedIndices.has(index);
                  const hasError = mediaLoadErrors[fileKey] !== undefined;

                  const shouldPreload =
                    mediaToPreload.has(index) ||
                    isLoadedLocally ||
                    isLoadedGlobally ||
                    isIndexPreloaded;

                  return (
                    <div
                      key={`media-container-${object.id}`}
                      style={{ display: isCurrentMedia ? "block" : "none" }}
                      className="w-full h-full relative"
                    >
                      {object.kind === ObjectKind.VIDEO ? (
                        <div className="relative w-full h-full">
                          <video
                            controls={isCurrentMedia && !isLocked}
                            ref={(el) => {
                              videoRefs.current[index] = el;
                            }}
                            src={`${videoSources[index].src}`}
                            poster={videoSources[index].poster}
                            className={`w-full h-full object-contain bg-black max-h-[70vh] ${
                              isLocked ? "blur-sm opacity-70" : ""
                            }`}
                            preload={
                              shouldPreload && !hasError ? "auto" : "none"
                            }
                            crossOrigin="anonymous"
                            onLoadedMetadata={() =>
                              handleMediaLoaded(index, fileKey)
                            }
                            onError={() => handleMediaError(index, fileKey)}
                            style={{ display: shouldRender ? "block" : "none" }}
                          />
                          {isLocked && isCurrentMedia && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20 z-10">
                              <Lock className="text-white w-16 h-16 drop-shadow-md" />
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex-col h-full w-full flex items-center justify-end bg-black relative">
                          {videoSources[index].poster ? (
                            <>
                              <img
                                src={videoSources[index].poster}
                                alt={object.fileName}
                                loading="lazy"
                                className={`max-h-full max-w-full object-contain ${
                                  isLocked ? "blur-sm opacity-70" : ""
                                }`}
                                onLoad={() =>
                                  shouldPreload &&
                                  handleMediaLoaded(index, fileKey)
                                }
                                onError={() => handleMediaError(index, fileKey)}
                                style={{
                                  display: shouldRender ? "block" : "none",
                                }}
                              />
                              {isLocked && isCurrentMedia && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20 z-10">
                                  <Lock className="text-white w-16 h-16 drop-shadow-md" />
                                </div>
                              )}
                            </>
                          ) : (
                            <>
                              <AudioLines className="text-gray-400 w-[100px] h-[100px]" />
                              {isLocked && isCurrentMedia && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20 z-10">
                                  <Lock className="text-white w-16 h-16 drop-shadow-md" />
                                </div>
                              )}
                            </>
                          )}
                          <audio
                            controls={!isLocked}
                            ref={(el) => {
                              videoRefs.current[index] = el;
                            }}
                            preload={
                              shouldPreload && !hasError ? "auto" : "none"
                            }
                            src={`${videoSources[index].src}`}
                            className={`w-full min-h-fit py-1 ${
                              isLocked ? "opacity-50 pointer-events-none" : ""
                            }`}
                            crossOrigin="anonymous"
                            onLoadedMetadata={() =>
                              handleMediaLoaded(index, fileKey)
                            }
                            onError={() => handleMediaError(index, fileKey)}
                            style={{ display: shouldRender ? "block" : "none" }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Video info overlay */}
              {currentObject && (
                <div className="grid grid-cols-1 sm:grid-cols-3 py-2 px-3 bg-black bg-opacity-90 text-white w-full">
                  <div className="sm:col-span-1">
                    <h3 className="text-sm sm:text-lg font-bold truncate">
                      {currentObject.fileName}
                      {currentObject.isLocked && (
                        <Lock className="inline-block ml-1 w-4 h-4" />
                      )}
                    </h3>
                    <p className="text-xs sm:text-sm">
                      {formatInTimeZone(
                        currentObject.createdDate,
                        "UTC",
                        "MM.dd.yyyy hh:mm a",
                      )}
                    </p>
                  </div>

                  <p className="text-gray-300 text-center self-center hidden sm:block">
                    {currentIndex + 1} of {objects.length}
                  </p>
                  <div className="flex flex-row sm:flex-col gap-1 justify-between sm:items-end mt-1 sm:mt-0">
                    <p className="text-xs sm:text-sm">
                      {currentObject && formatBytes(currentObject.size)}
                    </p>
                    <button
                      className="rounded-md bg-sb-banner text-white px-2 py-1 sm:hidden text-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        closeModal();
                      }}
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Next video preview (partially visible) */}
          {currentIndex < objects.length - 1 && (
            <div
              className="absolute bottom-0 w-full h-12 md:h-16 bg-black bg-opacity-50 flex items-center justify-center cursor-pointer z-10"
              onClick={handleNext}
            >
              <div className="flex flex-col items-center">
                <p className="text-white text-sm truncate max-w-xs">
                  {objects[currentIndex + 1].fileName}
                </p>
                <ChevronDown size={24} className="text-white" />
              </div>
            </div>
          )}
        </div>
      </ModalContent>
    </Modal>
  );
}
