import { Modal, ModalContent } from "@heroui/react";
import { AudioLines, ChevronDown, ChevronUp, Lock, X } from "lucide-react";
import { type Object, ObjectKind } from "@prisma/client";
import { formatInTimeZone } from "date-fns-tz";
import { formatBytes } from "~/utils";
import { type UseVideoCarouselReturn } from "./useVideoCarousel";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMediaCache } from "~/contexts/MediaCacheContext";
import { Link } from "react-router";

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
    markVideoAsLoaded,
    markVideoAsError,
  } = useVideo;

  const mediaCache = useMediaCache();
  const [renderedIndices, setRenderedIndices] = useState<Set<number>>(
    new Set()
  );
  const mediaRetryTimeouts = useRef<Record<string, NodeJS.Timeout>>({});
  const videoElementsRef = useRef<
    Map<number, HTMLVideoElement | HTMLAudioElement | HTMLImageElement>
  >(new Map());

  // Create a memoized mapping of video sources
  const videoSources = useMemo(() => {
    return objects.map((obj) => ({
      src: endpoint + obj.s3fileKey,
      poster: obj.posterKey ? endpoint + obj.posterKey : undefined,
      key: obj.s3fileKey,
      cacheKey: endpoint + obj.s3fileKey,
      posterCacheKey: obj.posterKey ? endpoint + obj.posterKey : undefined,
    }));
  }, [objects, endpoint]);

  // Update which indices should be rendered based on current position
  useEffect(() => {
    if (!isOpen || currentIndex === -1) {
      return;
    }

    const newRenderedIndices = new Set<number>();

    // Always render current
    newRenderedIndices.add(currentIndex);

    // Add adjacent indices for smooth transitions
    if (currentIndex > 0) {
      newRenderedIndices.add(currentIndex - 1);
    }
    if (currentIndex < objects.length - 1) {
      newRenderedIndices.add(currentIndex + 1);
    }

    setRenderedIndices(newRenderedIndices);
  }, [isOpen, currentIndex, objects.length]);

  // Set up ref for current video
  useEffect(() => {
    if (isOpen && currentIndex >= 0) {
      const element = videoElementsRef.current.get(currentIndex);
      if (
        element &&
        (element instanceof HTMLVideoElement ||
          element instanceof HTMLAudioElement)
      ) {
        videoRef.current = element as HTMLVideoElement;
      }
    }
  }, [isOpen, currentIndex, videoRef]);

  // Manage play/pause state when switching videos
  useEffect(() => {
    if (isOpen) {
      // Pause all other videos
      videoElementsRef.current.forEach((element, index) => {
        if (
          (element instanceof HTMLVideoElement ||
            element instanceof HTMLAudioElement) &&
          index !== currentIndex
        ) {
          element.pause();
        }
      });

      if (currentObject?.isLocked) {
        setIsPlaying(false);
        if (videoRef.current) {
          videoRef.current.pause();
        }
      } else {
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
  const handleMediaLoaded = (
    index: number,
    fileKey: string,
    cacheKey: string
  ) => {
    if (objects[index]) {
      // Update global cache
      mediaCache.setMediaLoaded(cacheKey);
      // Notify the global tracking system
      markVideoAsLoaded(fileKey, index);
    }
  };

  // Handle media error event
  const handleMediaError = (
    index: number,
    fileKey: string,
    cacheKey: string
  ) => {
    // Update global cache
    mediaCache.setMediaError(cacheKey);
    // Notify the global error tracking
    markVideoAsError(fileKey, index);

    // Clear any existing timeout for this item
    if (mediaRetryTimeouts.current[fileKey]) {
      clearTimeout(mediaRetryTimeouts.current[fileKey]);
    }

    // Schedule a retry with exponential backoff
    const cacheStatus = mediaCache.getMediaStatus(cacheKey);
    const attempts = cacheStatus?.attempts || 0;
    const delay = Math.min(1000 * Math.pow(2, attempts), 30000);

    if (attempts < 5) {
      mediaRetryTimeouts.current[fileKey] = setTimeout(() => {
        mediaCache.clearMediaError(cacheKey);
      }, delay);
    }
  };

  // Clean up when modal closes or unmounting
  useEffect(() => {
    if (!isOpen) {
      // Clear rendered indices when modal closes
      setRenderedIndices(new Set());
      videoElementsRef.current.clear();
    }

    return () => {
      Object.values(mediaRetryTimeouts.current).forEach((timeoutId) => {
        clearTimeout(timeoutId);
      });
    };
  }, [isOpen]);

  // Function to determine if media is extremely tall/vertical
  const isExtremelyTall = (width: number, height: number) => {
    return width / height < 0.6;
  };

  // No need to render modal if it's not open
  if (!isOpen) return null;

  useEffect(() => {
    renderedIndices.forEach((index) => {
      const cacheKey = videoSources[index]?.cacheKey;
      const posterKey = videoSources[index]?.posterCacheKey;

      const cacheStatus = mediaCache.getMediaStatus(cacheKey);
      if (
        cacheKey &&
        !cacheStatus?.loaded &&
        !cacheStatus?.loading &&
        !cacheStatus?.error
      ) {
        mediaCache.setMediaLoading(cacheKey);
      }
      const posterStatus =
        (posterKey && mediaCache.getMediaStatus(posterKey)) ?? undefined;
      if (
        posterKey &&
        posterStatus &&
        !posterStatus?.loaded &&
        !posterStatus?.loading &&
        !posterStatus?.error
      ) {
        mediaCache.setMediaLoading(posterKey);
      }
    });
  }, [renderedIndices, videoSources]);

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
        {/* Close button - Only visible on md screens and larger */}
        <button
          onClick={closeModal}
          className="absolute top-0 right-0 z-50 bg-gray-800 bg-opacity-100 rounded-bl-lg p-4 text-white hover:bg-gray-900 transition-all pointer-events-auto hidden sm:block"
          aria-label="Close"
        >
          <X className="w-10 h-10" />
        </button>

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
                {[...renderedIndices].map((index) => {
                  const object = objects[index];
                  const isCurrentMedia = currentIndex === index;

                  const fileKey = object.s3fileKey;
                  const isLocked = object.isLocked;
                  const cacheKey = videoSources[index].cacheKey;
                  const posterCacheKey = videoSources[index].posterCacheKey;

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
                              if (el && !videoElementsRef.current.has(index)) {
                                videoElementsRef.current.set(index, el);
                              }
                            }}
                            src={videoSources[index].src}
                            poster={videoSources[index].poster}
                            className={`w-full h-full object-contain max-h-[70vh] ${
                              isLocked ? "blur-sm opacity-40" : ""
                            }`}
                            preload={isCurrentMedia ? "metadata" : "none"}
                            crossOrigin="anonymous"
                            onLoadedMetadata={(e) => {
                              const video = e.target as HTMLVideoElement;
                              if (
                                isExtremelyTall(
                                  video.videoWidth,
                                  video.videoHeight
                                )
                              ) {
                                video.style.objectFit = "contain";
                              }
                              handleMediaLoaded(index, fileKey, cacheKey);
                            }}
                            onError={() =>
                              handleMediaError(index, fileKey, cacheKey)
                            }
                          />
                          {isLocked && isCurrentMedia && (
                            <div className="absolute inset-0 flex items-center justify-center z-10">
                              <Lock className="text-white w-16 h-16 drop-shadow-md" />
                            </div>
                          )}
                        </div>
                      ) : object.kind === ObjectKind.AUDIO ? (
                        <div className="flex-col h-full w-full flex items-center justify-end relative">
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
                              />
                              {isLocked && isCurrentMedia && (
                                <div className="absolute inset-0 flex items-center justify-center bg-opacity-20 z-10">
                                  <Lock className="text-white w-16 h-16 drop-shadow-md" />
                                </div>
                              )}
                            </>
                          ) : (
                            <>
                              <AudioLines className="text-gray-400 w-[100px] h-[100px]" />
                              {isLocked && isCurrentMedia && (
                                <div className="absolute inset-0 flex items-center justify-center bg-opacity-20 z-10">
                                  <Lock className="text-white w-16 h-16 drop-shadow-md" />
                                </div>
                              )}
                            </>
                          )}
                          <audio
                            controls={!isLocked}
                            ref={(el) => {
                              if (el && !videoElementsRef.current.has(index)) {
                                videoElementsRef.current.set(index, el);
                              }
                            }}
                            preload={isCurrentMedia ? "metadata" : "none"}
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
                          />
                        </div>
                      ) : (
                        <div className="relative w-full h-full">
                          <img
                            ref={(el) => {
                              if (el && !videoElementsRef.current.has(index)) {
                                videoElementsRef.current.set(index, el);
                              }
                            }}
                            src={videoSources[index].src}
                            className={`w-full h-full object-contain max-h-[70vh] ${
                              isLocked ? "blur-sm opacity-40" : ""
                            }`}
                            crossOrigin="anonymous"
                            onLoad={(e) => {
                              const img = e.target as HTMLImageElement;
                              if (
                                isExtremelyTall(
                                  img.naturalWidth,
                                  img.naturalHeight
                                )
                              ) {
                                img.style.objectFit = "contain";
                              }
                              handleMediaLoaded(index, fileKey, cacheKey);
                            }}
                            onError={() =>
                              handleMediaError(index, fileKey, cacheKey)
                            }
                          />
                          {isLocked && isCurrentMedia && (
                            <div className="absolute inset-0 flex items-center justify-center z-10">
                              <Lock className="text-white w-16 h-16 drop-shadow-md" />
                            </div>
                          )}
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
                    <div className="inline-flex gap-2">
                      <button
                        className="rounded-md bg-sb-banner text-white px-2 py-1 sm:hidden text-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          closeModal();
                        }}
                      >
                        Close
                      </button>
                      {!currentObject.isLocked && (
                        <Link
                          to={`/data/download/${encodeURIComponent(currentObject.s3fileKey)}`}
                          reloadDocument
                          className="rounded-md bg-sb-banner text-white px-2 py-1 text-sm"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Download
                        </Link>
                      )}
                    </div>
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
