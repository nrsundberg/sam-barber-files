import { useState, useEffect, useRef } from "react";
import type { Object } from "@prisma/client";

interface UseVideoCarouselProps {
  objects: Object[];
  initialObjectIndex?: number;
  endpoint: string;
}

export interface UseVideoCarouselReturn {
  // State
  isOpen: boolean;
  currentIndex: number;
  isPlaying: boolean;
  isScrolling: boolean;
  currentObject: Object | null;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  containerRef: React.RefObject<HTMLDivElement | null>;
  setIsPlaying: React.Dispatch<React.SetStateAction<boolean>>;

  // Actions
  openModal: (objectIndex: number) => void;
  closeModal: () => void;
  navigateToVideo: (index: number) => void;
  handleNext: () => void;
  handlePrev: () => void;
  getVideoSourceUrl: (object: Object) => string;
  getPosterUrl: (object: Object) => string | undefined;

  // Event handlers
  handleTouchStart: (e: React.TouchEvent) => void;
  handleTouchMove: (e: React.TouchEvent) => void;
  handleTouchEnd: () => void;
  handleWheel: (e: React.WheelEvent) => void;
}

export function useVideoCarousel({
  objects,
  initialObjectIndex = 0,
  endpoint,
}: UseVideoCarouselProps): UseVideoCarouselReturn {
  let [isOpen, setIsOpen] = useState(false);
  let [currentIndex, setCurrentIndex] = useState(initialObjectIndex);
  let [isPlaying, setIsPlaying] = useState(false);
  let [isScrolling, setIsScrolling] = useState(false);

  // Create stable URL getters instead of regenerating URLs on every render
  const getVideoSourceUrl = (object: Object) => endpoint + object.s3fileKey;
  const getPosterUrl = (object: Object) =>
    object.posterKey ? endpoint + object.posterKey : undefined;

  let videoRef = useRef<HTMLVideoElement | null>(null);
  let containerRef = useRef<HTMLDivElement | null>(null);
  let touchStartY = useRef<number | null>(null);
  let scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const currentObject = objects.length > 0 ? objects[currentIndex] : null;

  // Handle video ended event
  useEffect(() => {
    if (!videoRef.current) return;

    const handleEnded = () => {
      setIsPlaying(false);
    };

    videoRef.current.addEventListener("ended", handleEnded);

    return () => {
      if (videoRef.current) {
        videoRef.current.removeEventListener("ended", handleEnded);
      }
    };
  }, [currentIndex]);

  // Control video playback
  useEffect(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.play().catch(() => setIsPlaying(false));
      } else {
        videoRef.current.pause();
      }
    }
  }, [isPlaying, videoRef.current]);

  // Clean up any timeout on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  // Preload adjacent videos when current video is loaded
  useEffect(() => {
    if (!isOpen || !currentObject) return;

    // Preload the next video (if exists)
    if (currentIndex < objects.length - 1) {
      const nextObject = objects[currentIndex + 1];
      const preloadNext = new Image();
      if (nextObject.posterKey) {
        preloadNext.src = getPosterUrl(nextObject) as string;
      }
    }

    // Preload the previous video (if exists)
    if (currentIndex > 0) {
      const prevObject = objects[currentIndex - 1];
      const preloadPrev = new Image();
      if (prevObject.posterKey) {
        preloadPrev.src = getPosterUrl(prevObject) as string;
      }
    }
  }, [isOpen, currentIndex, objects]);

  // Functions for controlling the carousel
  const openModal = (objectIndex: number) => {
    setCurrentIndex(objectIndex);
    setIsOpen(true);
  };

  const closeModal = () => {
    setIsOpen(false);
    setIsPlaying(false);
  };

  const navigateToVideo = (index: number) => {
    if (index >= 0 && index < objects.length) {
      setIsPlaying(false);
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
    if (touchStartY.current === null || isScrolling) return;

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

      // Reset scrolling state after a delay
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      scrollTimeoutRef.current = setTimeout(() => {
        setIsScrolling(false);
      }, 500);
    }
  };

  const handleTouchEnd = () => {
    touchStartY.current = null;
  };

  // Handle wheel events for desktop scrolling
  const handleWheel = (e: React.WheelEvent) => {
    if (isScrolling) return;

    setIsScrolling(true);

    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    scrollTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false);
    }, 500);

    if (e.deltaY > 0) {
      // Scrolling down - go to next video
      handleNext();
    } else {
      // Scrolling up - go to previous video
      handlePrev();
    }
  };

  return {
    // State
    isOpen,
    currentIndex,
    isPlaying,
    isScrolling,
    currentObject,
    videoRef,
    containerRef,
    setIsPlaying,

    // Actions
    openModal,
    closeModal,
    navigateToVideo,
    handleNext,
    handlePrev,
    getVideoSourceUrl,
    getPosterUrl,

    // Event handlers
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleWheel,
  };
}
