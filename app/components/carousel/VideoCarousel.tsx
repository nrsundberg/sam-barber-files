import React, { useState, useEffect, useRef } from "react";
import { Button, Modal, ModalContent } from "@heroui/react";
import {
  ChevronUp,
  ChevronDown,
  X,
  Play,
  Pause,
  Volume2,
  VolumeX,
} from "lucide-react";
import type { Object } from "@prisma/client";
import { formatInTimeZone } from "date-fns-tz";
import { formatBytes } from "~/utils";

interface VideoCarouselModalProps {
  isOpen: boolean;
  onClose: () => void;
  objects: Object[];
  initialObjectIndex: number;
  endpoint: string;
}

const VideoCarouselModal = ({
  isOpen,
  onClose,
  objects,
  initialObjectIndex,
  endpoint,
}: VideoCarouselModalProps) => {
  const [currentIndex, setCurrentIndex] = useState(initialObjectIndex);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef<number | null>(null);

  const currentObject = objects[currentIndex];

  useEffect(() => {
    setCurrentIndex(initialObjectIndex);
  }, [initialObjectIndex, isOpen]);

  useEffect(() => {
    if (!videoRef.current) return;

    const updateProgress = () => {
      if (videoRef.current) {
        setProgress(videoRef.current.currentTime);
      }
    };

    const updateDuration = () => {
      if (videoRef.current) {
        setDuration(videoRef.current.duration);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
    };

    videoRef.current.addEventListener("timeupdate", updateProgress);
    videoRef.current.addEventListener("loadedmetadata", updateDuration);
    videoRef.current.addEventListener("ended", handleEnded);

    return () => {
      if (videoRef.current) {
        videoRef.current.removeEventListener("timeupdate", updateProgress);
        videoRef.current.removeEventListener("loadedmetadata", updateDuration);
        videoRef.current.removeEventListener("ended", handleEnded);
      }
    };
  }, [currentIndex]);

  useEffect(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.play().catch(() => setIsPlaying(false));
      } else {
        videoRef.current.pause();
      }
    }
  }, [isPlaying]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
    }
  }, [isMuted]);

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleMuteToggle = () => {
    setIsMuted(!isMuted);
  };

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setProgress(newTime);
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const navigateToVideo = (index: number) => {
    if (index >= 0 && index < objects.length) {
      setIsPlaying(false);
      setProgress(0);
      setCurrentIndex(index);
    }
  };

  const handleNext = () => navigateToVideo(currentIndex + 1);
  const handlePrev = () => navigateToVideo(currentIndex - 1);

  // Touch handlers for mobile swiping
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return;

    const touchY = e.touches[0].clientY;
    const diff = touchStartY.current - touchY;

    if (Math.abs(diff) > 50) {
      setIsScrolling(true);
      if (diff > 0) {
        // Swiping up - go to next video
        handleNext();
      } else {
        // Swiping down - go to previous video
        handlePrev();
      }
      touchStartY.current = null;
    }
  };

  const handleTouchEnd = () => {
    touchStartY.current = null;
    setIsScrolling(false);
  };

  // Handle wheel events for desktop scrolling
  const handleWheel = (e: React.WheelEvent) => {
    if (isScrolling) return;

    setIsScrolling(true);
    const timer = setTimeout(() => {
      setIsScrolling(false);
    }, 500);

    if (e.deltaY > 0) {
      // Scrolling down - go to next video
      handleNext();
    } else {
      // Scrolling up - go to previous video
      handlePrev();
    }

    return () => clearTimeout(timer);
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="full"
      classNames={{
        base: "bg-black bg-opacity-90",
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
          <Button
            isIconOnly
            variant="light"
            className="absolute top-4 right-4 z-50 text-white"
            onClick={onClose}
          >
            <X size={24} />
          </Button>

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
              <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 p-4 text-white">
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

                {/* Video controls */}
                <div className="mt-2 flex items-center gap-4">
                  <Button
                    isIconOnly
                    variant="light"
                    className="text-white"
                    onClick={handlePlayPause}
                  >
                    {isPlaying ? <Pause size={20} /> : <Play size={20} />}
                  </Button>

                  <Button
                    isIconOnly
                    variant="light"
                    className="text-white"
                    onClick={handleMuteToggle}
                  >
                    {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                  </Button>

                  <div className="flex-1 flex items-center gap-2">
                    <span className="text-xs">{formatTime(progress)}</span>
                    <input
                      type="range"
                      min="0"
                      max={duration || 100}
                      value={progress}
                      onChange={handleProgressChange}
                      className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                    />
                    <span className="text-xs">{formatTime(duration)}</span>
                  </div>
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
};

export default VideoCarouselModal;
