import { Modal, ModalContent } from "@heroui/react";
import { ChevronUp, ChevronDown, AudioLines } from "lucide-react";
import { ObjectKind, type Object } from "@prisma/client";
import { formatInTimeZone } from "date-fns-tz";
import { formatBytes } from "~/utils";
import { type UseVideoCarouselReturn } from "./useVideoCarousel";
import { useMemo, useRef, useEffect, useState } from "react";

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
    new Set()
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

      // Update current video playing state
      if (videoRef.current) {
        if (isPlaying) {
          videoRef.current.play().catch(() => setIsPlaying(false));
        } else {
          videoRef.current.pause();
        }
      }
    }
  }, [isOpen, currentIndex, isPlaying, setIsPlaying, videoRef]);

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

  // No need to render modal if it's not open
  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={closeModal}
      size={"3xl"}
      backdrop={"blur"}
      className="bg-transparent shadow-none"
      classNames={{
        wrapper: "flex items-center justify-center h-full",
      }}
    >
      <ModalContent>
        <div
          ref={containerRef}
          className="relative h-screen flex flex-col items-center"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onWheel={handleWheel}
        >
          {/* Previous video preview (partially visible) */}
          {currentIndex > 0 && (
            <div
              className="absolute top-0 w-full h-20 bg-opacity-70 flex items-center justify-center cursor-pointer"
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
            <div className="relative w-full max-w-6xl aspect-video">
              {/* We render all videos but keep most hidden */}
              {objects.map((object, index) => {
                const shouldRender = true; // Always render but might be hidden
                const isCurrentMedia = currentIndex === index;
                const fileKey = object.s3fileKey;

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
                    className="w-full h-full"
                  >
                    {object.kind === ObjectKind.VIDEO ? (
                      <video
                        controls={isCurrentMedia}
                        ref={(el) => {
                          videoRefs.current[index] = el;
                        }}
                        src={`${videoSources[index].src}`}
                        poster={videoSources[index].poster}
                        className="w-full h-full object-contain"
                        preload={shouldPreload && !hasError ? "auto" : "none"}
                        crossOrigin="anonymous"
                        onLoadedMetadata={() =>
                          handleMediaLoaded(index, fileKey)
                        }
                        onError={() => handleMediaError(index, fileKey)}
                        style={{ display: shouldRender ? "block" : "none" }}
                      />
                    ) : (
                      <div className="flex-col h-full content-end justify-items-center">
                        {videoSources[index].poster ? (
                          <img
                            src={videoSources[index].poster}
                            alt={object.fileName}
                            loading="lazy"
                            onLoad={() =>
                              shouldPreload && handleMediaLoaded(index, fileKey)
                            }
                            onError={() => handleMediaError(index, fileKey)}
                            style={{ display: shouldRender ? "block" : "none" }}
                          />
                        ) : (
                          <AudioLines className="text-gray-400 w-[100px] h-[100px]" />
                        )}
                        <audio
                          controls
                          ref={(el) => {
                            videoRefs.current[index] = el;
                          }}
                          preload={shouldPreload && !hasError ? "auto" : "none"}
                          src={`${videoSources[index].src}`}
                          className="w-full min-h-fit py-1"
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

              {/* Video info overlay */}
              {currentObject && (
                <div className="grid grid-cols-3 py-1">
                  <div className="bg-opacity-50 text-white">
                    <h3 className="text-lg font-bold">
                      {currentObject.fileName}
                    </h3>
                    <p className="text-sm">
                      {formatInTimeZone(
                        currentObject.createdDate,
                        "UTC",
                        "MM.dd.yyyy hh:mm a"
                      )}
                    </p>
                  </div>

                  <p className="text-gray-500 text-center">
                    {currentIndex + 1} of {objects.length}
                  </p>
                  <div className="flex flex-col gap-1">
                    <button
                      className="my-3 rounded-md bg-sb-banner text-white px-4 py-2 sm:hidden"
                      onClick={(e) => {
                        e.stopPropagation();
                        closeModal();
                      }}
                    >
                      Close
                    </button>
                    <p className="text-sm self-end place-self-end">
                      {currentObject && formatBytes(currentObject.size)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Next video preview (partially visible) */}
          {currentIndex < objects.length - 1 && (
            <div
              className="absolute bottom-0 w-full h-20 bg-opacity-70 flex items-center justify-center cursor-pointer"
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
