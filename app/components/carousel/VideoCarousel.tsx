import { Modal, ModalContent } from "@heroui/react";
import { AudioLines, ChevronDown, ChevronUp, Lock, X } from "lucide-react";
import { type Object, ObjectKind } from "@prisma/client";
import { formatInTimeZone } from "date-fns-tz";
import { formatBytes } from "~/utils";
import { type UseVideoCarouselReturn } from "./useVideoCarousel";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  const {
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
    new Set([currentIndex])
  );
  const videoElementsRef = useRef<
    Map<number, HTMLVideoElement | HTMLAudioElement | HTMLImageElement>
  >(new Map());

  const videoSources = useMemo(() => {
    return objects.map((obj) => ({
      src: endpoint + obj.s3fileKey,
      poster: obj.posterKey ? endpoint + obj.posterKey : undefined,
      key: obj.s3fileKey,
      cacheKey: endpoint + obj.s3fileKey,
      posterCacheKey: obj.posterKey ? endpoint + obj.posterKey : undefined,
    }));
  }, [objects, endpoint]);

  useEffect(() => {
    if (!isOpen || currentIndex === -1) return;
    const newRenderedIndices = new Set<number>();
    newRenderedIndices.add(currentIndex);
    setRenderedIndices(newRenderedIndices);
  }, [isOpen, currentIndex, objects.length]);

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

  useEffect(() => {
    if (isOpen) {
      videoElementsRef.current.forEach((element, index) => {
        if (
          (element instanceof HTMLVideoElement ||
            element instanceof HTMLAudioElement) &&
          index !== currentIndex
        ) {
          element.pause();
          if (element instanceof HTMLVideoElement) {
            element.removeAttribute("src");
            element.load();
          }
        }
      });
    }
  }, [isOpen, currentIndex]);

  const handleMediaLoaded = useCallback(
    (index: number, fileKey: string, cacheKey: string) => {
      if (index >= 0 && index < objects.length && objects[index]) {
        mediaCache.setMediaLoaded(cacheKey);
        markVideoAsLoaded(fileKey, index);
      }
    },
    [mediaCache, markVideoAsLoaded, objects]
  );

  const handleMediaError = useCallback(
    (index: number, fileKey: string, cacheKey: string) => {
      mediaCache.setMediaError(cacheKey);
      markVideoAsError(fileKey, index);
    },
    [mediaCache, markVideoAsError]
  );

  useEffect(() => {
    if (!isOpen) {
      setRenderedIndices(new Set());
      videoElementsRef.current.clear();
    }
  }, [isOpen]);

  const isExtremelyTall = (width: number, height: number) => {
    return width / height < 0.5;
  };

  useEffect(() => {
    const cacheKey = videoSources[currentIndex]?.cacheKey;
    const posterKey = videoSources[currentIndex]?.posterCacheKey;
    if (cacheKey) {
      const cacheStatus = mediaCache.getMediaStatus(cacheKey);
      if (
        !cacheStatus?.loaded &&
        !cacheStatus?.loading &&
        !cacheStatus?.error
      ) {
        mediaCache.setMediaLoading(cacheKey);
      }
    }
    if (posterKey) {
      const posterStatus = mediaCache.getMediaStatus(posterKey);
      if (
        !posterStatus?.loaded &&
        !posterStatus?.loading &&
        !posterStatus?.error
      ) {
        mediaCache.setMediaLoading(posterKey);
      }
    }
  }, [currentIndex, videoSources, mediaCache]);

  const getMediaRefCallback = useCallback((index: number) => {
    return (
      el: HTMLVideoElement | HTMLAudioElement | HTMLImageElement | null
    ) => {
      if (el) {
        videoElementsRef.current.set(index, el);
      } else {
        videoElementsRef.current.delete(index);
      }
    };
  }, []);

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

          <div className="flex-1 w-full flex flex-col items-center justify-center">
            <div className="relative w-full h-full max-w-screen-xl mx-auto flex flex-col justify-center items-center">
              <div className="h-[50vh] sm:h-[70vh] w-full flex items-center justify-center bg-black">
                {objects.map((object, index) => {
                  const isCurrentMedia = currentIndex === index;
                  const mediaRef = getMediaRefCallback(index);
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
                            ref={mediaRef}
                            src={isCurrentMedia ? videoSources[index].src : ""}
                            poster={
                              isCurrentMedia
                                ? videoSources[index].poster
                                : undefined
                            }
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
                                video.classList.add("object-contain");
                              }
                              handleMediaLoaded(index, fileKey, cacheKey);
                            }}
                            onError={() =>
                              handleMediaError(index, fileKey, cacheKey)
                            }
                          />
                          {isLocked && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <Lock className="w-12 h-12 text-white" />
                            </div>
                          )}
                        </div>
                      ) : object.kind === ObjectKind.AUDIO ? (
                        <div className="relative w-full h-full flex items-center justify-center">
                          <audio
                            controls={isCurrentMedia && !isLocked}
                            ref={mediaRef}
                            src={isCurrentMedia ? videoSources[index].src : ""}
                            className="w-full max-w-md"
                            preload={isCurrentMedia ? "metadata" : "none"}
                            crossOrigin="anonymous"
                            onLoadedMetadata={() =>
                              handleMediaLoaded(index, fileKey, cacheKey)
                            }
                            onError={() =>
                              handleMediaError(index, fileKey, cacheKey)
                            }
                          />
                          {isLocked && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <Lock className="w-12 h-12 text-white" />
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="relative w-full h-full">
                          <img
                            ref={mediaRef}
                            src={isCurrentMedia ? videoSources[index].src : ""}
                            className={`w-full h-full object-contain max-h-[70vh] ${
                              isLocked ? "blur-sm opacity-40" : ""
                            }`}
                            crossOrigin="anonymous"
                            onLoad={() =>
                              handleMediaLoaded(index, fileKey, cacheKey)
                            }
                            onError={() =>
                              handleMediaError(index, fileKey, cacheKey)
                            }
                          />
                          {isLocked && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <Lock className="w-12 h-12 text-white" />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {currentIndex < objects.length - 1 && (
            <div
              className="absolute bottom-0 w-full h-12 md:h-16 flex items-center justify-center cursor-pointer z-10"
              onClick={handleNext}
            >
              <div className="flex flex-col items-center">
                <ChevronDown size={24} className="text-white" />
                <p className="text-white text-sm truncate max-w-xs">
                  {objects[currentIndex + 1].fileName}
                </p>
              </div>
            </div>
          )}
        </div>
      </ModalContent>
    </Modal>
  );
}
