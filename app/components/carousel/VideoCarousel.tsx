import { Button, Modal, ModalContent } from "@heroui/react";
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
    isMediaLoaded,
    setMediaLoaded,
    loadedVideos,
    preloadedIndices,
    markVideoAsLoaded,
  } = useVideo;

  // Create refs for all video elements
  const videoRefs = useRef<(HTMLVideoElement | HTMLAudioElement | null)[]>([]);
  // Track which videos have been loaded in this specific carousel instance
  const [localLoadedKeys, setLocalLoadedKeys] = useState<Set<string>>(
    new Set()
  );

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

      // Mark as loaded if it was already loaded before
      if (
        preloadedIndices.has(currentIndex) ||
        localLoadedKeys.has(objects[currentIndex].s3fileKey)
      ) {
        setMediaLoaded(true);
      }
    }
  }, [
    isOpen,
    currentIndex,
    videoRef,
    setMediaLoaded,
    preloadedIndices,
    objects,
    localLoadedKeys,
  ]);

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
      if (videoRef.current && isMediaLoaded) {
        if (isPlaying) {
          videoRef.current.play().catch(() => setIsPlaying(false));
        } else {
          videoRef.current.pause();
        }
      }
    }
  }, [isOpen, currentIndex, isPlaying, setIsPlaying, isMediaLoaded, videoRef]);

  // Handle media load event
  const handleMediaLoaded = (index: number, fileKey: string) => {
    if (objects[index]) {
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
                        src={`${videoSources[index].src}#t=0.1`} // Add timestamp to only load metadata initially
                        poster={videoSources[index].poster}
                        className="w-full h-full object-contain"
                        preload={shouldPreload ? "metadata" : "none"} // Only load metadata initially
                        crossOrigin="anonymous"
                        onLoadedMetadata={() =>
                          handleMediaLoaded(index, fileKey)
                        }
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
                          preload={shouldPreload ? "metadata" : "none"} // Only load metadata initially
                          src={`${videoSources[index].src}#t=0.1`} // Add timestamp to only load metadata
                          className="w-full min-h-fit py-1"
                          crossOrigin="anonymous"
                          onLoadedMetadata={() =>
                            handleMediaLoaded(index, fileKey)
                          }
                          style={{ display: shouldRender ? "block" : "none" }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Loading indicator */}
              {currentIndex !== -1 && !isMediaLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-70">
                  <div className="w-16 h-16 rounded-full border-4 border-gray-600 border-t-white animate-spin"></div>
                </div>
              )}

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
