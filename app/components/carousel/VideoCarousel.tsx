import { Modal, ModalContent } from "@heroui/react";
import { AudioLines, ChevronDown, ChevronUp, Lock } from "lucide-react";
import { type Object, ObjectKind } from "@prisma/client";
import { formatInTimeZone } from "date-fns-tz";
import { formatBytes } from "~/utils";
import { type UseVideoCarouselReturn } from "./useVideoCarousel";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { globalMediaCache } from "~/contexts/MediaCacheContext";

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

  // Track loading state for media elements
  const [mediaLoadingState, setMediaLoadingState] = useState<
    Map<string, "loading" | "loaded" | "error">
  >(new Map());
  const loadingStateRef = useRef<Map<string, "loading" | "loaded" | "error">>(
    new Map()
  );

  // Track which media items should be preloaded based on current position
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

  // Create memoized mapping of video sources - stable references
  const videoSources = useMemo(() => {
    return objects.map((obj) => ({
      src: endpoint + obj.s3fileKey,
      poster: obj.posterKey ? endpoint + obj.posterKey : undefined,
      key: obj.s3fileKey,
      cacheKey: endpoint + obj.s3fileKey, // Full URL for cache lookup
      posterCacheKey: obj.posterKey ? endpoint + obj.posterKey : undefined,
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

  // Memoized handle media loaded
  const handleMediaLoaded = useCallback(
    (index: number, fileKey: string, cacheKey: string) => {
      if (objects[index]) {
        // Update local loading state
        loadingStateRef.current.set(fileKey, "loaded");
        setMediaLoadingState(new Map(loadingStateRef.current));

        // Update global cache
        globalMediaCache.set(cacheKey, {
          loaded: true,
          error: false,
          timestamp: Date.now(),
        });

        // Notify the video carousel hook
        markVideoAsLoaded(fileKey, index);
      }
    },
    [objects, markVideoAsLoaded]
  );

  // Memoized handle media error
  const handleMediaError = useCallback(
    (index: number, fileKey: string, cacheKey: string) => {
      // Update local loading state
      loadingStateRef.current.set(fileKey, "error");
      setMediaLoadingState(new Map(loadingStateRef.current));

      // Update global cache
      globalMediaCache.set(cacheKey, {
        loaded: false,
        error: true,
        timestamp: Date.now(),
      });

      // Notify the video carousel hook
      markVideoAsError(fileKey, index);
    },
    [markVideoAsError]
  );

  // Memoized check if media should be loaded based on cache
  const shouldLoadMedia = useCallback(
    (index: number, cacheKey: string, fileKey: string): boolean => {
      // First check if it's in the preload range
      if (!mediaToPreload.has(index)) return false;

      // Check local loading state to prevent duplicate loads
      const localState = loadingStateRef.current.get(fileKey);
      if (localState === "loading" || localState === "loaded") return false;

      // Check global cache
      const cached = globalMediaCache.get(cacheKey);
      if (cached) {
        if (cached.loaded && !cached.error) {
          // Already loaded globally, update local state
          loadingStateRef.current.set(fileKey, "loaded");
          return false;
        }

        if (cached.error) {
          // Check if enough time has passed for retry
          const timeSinceError = Date.now() - cached.timestamp;
          if (timeSinceError < 5000) {
            // 5 second minimum between retries
            return false;
          }
        }
      }

      // Mark as loading to prevent duplicate requests
      loadingStateRef.current.set(fileKey, "loading");
      return true;
    },
    [mediaToPreload]
  );

  // Handler for play/pause that respects locked status
  const handlePlayPause = useCallback(() => {
    if (currentObject && !currentObject.isLocked) {
      setIsPlaying(!isPlaying);
    }
  }, [currentObject, isPlaying, setIsPlaying]);

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
          {/* Previous video preview */}
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
              <div className="h-[50vh] sm:h-[70vh] w-full flex items-center justify-center bg-black">
                {/* Render all videos but keep most hidden */}
                {objects.map((object, index) => {
                  const isCurrentMedia = currentIndex === index;
                  const fileKey = object.s3fileKey;
                  const isLocked = object.isLocked;
                  const cacheKey = videoSources[index].cacheKey;
                  const posterCacheKey = videoSources[index].posterCacheKey;

                  // Check if media or poster is already in global cache
                  const mediaInCache =
                    globalMediaCache.get(cacheKey)?.loaded || false;
                  const posterInCache = posterCacheKey
                    ? globalMediaCache.get(posterCacheKey)?.loaded || false
                    : true;

                  const shouldPreload = shouldLoadMedia(
                    index,
                    cacheKey,
                    fileKey
                  );

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
                            src={videoSources[index].src}
                            poster={videoSources[index].poster}
                            className={`w-full h-full object-contain bg-black max-h-[70vh] ${
                              isLocked ? "blur-sm opacity-70" : ""
                            }`}
                            preload={
                              shouldPreload || mediaInCache ? "auto" : "none"
                            }
                            crossOrigin="anonymous"
                            onLoadedMetadata={() =>
                              handleMediaLoaded(index, fileKey, cacheKey)
                            }
                            onError={() =>
                              handleMediaError(index, fileKey, cacheKey)
                            }
                            style={{ display: "block" }}
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
                                loading={
                                  shouldPreload || posterInCache
                                    ? "eager"
                                    : "lazy"
                                }
                                className={`max-h-full max-w-full object-contain ${
                                  isLocked ? "blur-sm opacity-70" : ""
                                }`}
                                onLoad={() =>
                                  posterCacheKey &&
                                  handleMediaLoaded(
                                    index,
                                    fileKey,
                                    posterCacheKey
                                  )
                                }
                                onError={() =>
                                  posterCacheKey &&
                                  handleMediaError(
                                    index,
                                    fileKey,
                                    posterCacheKey
                                  )
                                }
                                style={{ display: "block" }}
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
                              shouldPreload || mediaInCache ? "auto" : "none"
                            }
                            src={videoSources[index].src}
                            className={`w-full min-h-fit py-1 ${
                              isLocked ? "opacity-50 pointer-events-none" : ""
                            }`}
                            crossOrigin="anonymous"
                            onLoadedMetadata={() =>
                              handleMediaLoaded(index, fileKey, cacheKey)
                            }
                            onError={() =>
                              handleMediaError(index, fileKey, cacheKey)
                            }
                            style={{ display: "block" }}
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
                        "MM.dd.yyyy hh:mm a"
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

          {/* Next video preview */}
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
