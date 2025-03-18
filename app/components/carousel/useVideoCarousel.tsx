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
  isMediaLoaded: boolean; // New state to track media loading
  setMediaLoaded: (loaded: boolean) => void; // New function to set media loaded state

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
  let [isMediaLoaded, setIsMediaLoaded] = useState(false);

  // Track which videos have already been loaded to avoid refetching
  let [loadedVideos, setLoadedVideos] = useState<Set<string>>(new Set());

  // Create stable URL getters instead of regenerating URLs on every render
  const getVideoSourceUrl = (object: Object) => endpoint + object.s3fileKey;
  const getPosterUrl = (object: Object) =>
    object.posterKey ? endpoint + object.posterKey : undefined;

  let videoRef = useRef<HTMLVideoElement | null>(null);
  let containerRef = useRef<HTMLDivElement | null>(null);
  let touchStartY = useRef<number | null>(null);
  let scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const currentObject =
    objects.length > 0 && currentIndex >= 0 ? objects[currentIndex] : null;

  // Reset state when modal is closed
  useEffect(() => {
    if (!isOpen) {
      setIsPlaying(false);
      // We're not resetting currentIndex so we can reopen to the same item if needed
    }
  }, [isOpen]);

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
    if (videoRef.current && isMediaLoaded) {
      if (isPlaying) {
        videoRef.current.play().catch(() => setIsPlaying(false));
      } else {
        videoRef.current.pause();
      }
    }
  }, [isPlaying, videoRef.current, isMediaLoaded]);

  // Clean up any timeout on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  // Track media load state
  const setMediaLoaded = (loaded: boolean) => {
    setIsMediaLoaded(loaded);

    // If a video is successfully loaded, add its key to the loadedVideos set
    if (loaded && currentObject) {
      setLoadedVideos((prev) => {
        const updated = new Set(prev);
        updated.add(currentObject.s3fileKey);
        return updated;
      });
    }
  };

  // Functions for controlling the carousel
  const openModal = (objectIndex: number) => {
    setCurrentIndex(objectIndex);
    setIsOpen(true);

    // Check if this video was already loaded
    if (
      objects[objectIndex] &&
      loadedVideos.has(objects[objectIndex].s3fileKey)
    ) {
      setIsMediaLoaded(true);
    } else {
      setIsMediaLoaded(false);
    }
  };

  const closeModal = () => {
    setIsOpen(false);
    setIsPlaying(false);
  };

  const navigateToVideo = (index: number) => {
    if (index >= 0 && index < objects.length) {
      setIsPlaying(false);
      setCurrentIndex(index);

      // Check if this video was already loaded
      if (objects[index] && loadedVideos.has(objects[index].s3fileKey)) {
        setIsMediaLoaded(true);
      } else {
        setIsMediaLoaded(false);
      }
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
    isMediaLoaded,
    setMediaLoaded,

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
