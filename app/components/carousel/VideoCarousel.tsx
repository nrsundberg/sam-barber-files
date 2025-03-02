import React from "react";
import { Modal, ModalContent } from "@heroui/react";
import { ChevronUp, ChevronDown } from "lucide-react";
import type { Object } from "@prisma/client";
import { formatInTimeZone } from "date-fns-tz";
import { formatBytes } from "~/utils";
import { useVideoCarousel } from "./useVideoCarousel";

interface VideoCarouselProps {
  objects: Object[];
  initialObjectIndex: number;
  endpoint: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function VideoCarousel({
  objects,
  initialObjectIndex,
  endpoint,
  isOpen,
  onClose,
}: VideoCarouselProps) {
  const {
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
  } = useVideoCarousel({
    objects,
    initialObjectIndex,
    endpoint,
  });

  if (!isOpen || !currentObject) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size={"xl"}
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
              className="absolute top-0 w-full h-20 bg-black bg-opacity-70 flex items-center justify-center cursor-pointer"
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
            <div className="relative w-full max-w-4xl aspect-video">
              <video
                controls
                ref={videoRef}
                src={endpoint + currentObject.s3fileKey}
                className="w-full h-full object-contain"
                poster={
                  currentObject.posterKey
                    ? endpoint + currentObject.posterKey
                    : undefined
                }
              />

              {/* Video info overlay */}
              <div className="left-0 right-0 bg-black bg-opacity-50 p-4 text-white">
                <h3 className="text-lg font-bold mb-1">
                  {currentObject.fileName}
                </h3>
                <div className="flex justify-between text-sm">
                  <p>
                    {formatInTimeZone(
                      currentObject.createdDate,
                      "UTC",
                      "MM.dd.yyyy hh:mm a"
                    )}
                  </p>
                  <p>{formatBytes(currentObject.size)}</p>
                </div>
              </div>
            </div>

            <div className="mt-4 px-4 w-full max-w-4xl">
              <p className="text-white text-center">
                {currentIndex + 1} of {objects.length}
              </p>
            </div>
          </div>

          {/* Next video preview (partially visible) */}
          {currentIndex < objects.length - 1 && (
            <div
              className="absolute bottom-0 w-full h-20 bg-black bg-opacity-70 flex items-center justify-center cursor-pointer"
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
