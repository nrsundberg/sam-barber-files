import { useEffect, useRef, useState } from "react";
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
  loadedVideos: Set<string>; // Expose loaded videos set
  preloadedIndices: Set<number>; // Expose which indices have been preloaded

  // Actions
  openModal: (objectIndex: number) => void;
  closeModal: () => void;
  navigateToVideo: (index: number) => void;
  handleNext: () => void;
  handlePrev: () => void;
  getVideoSourceUrl: (object: Object) => string;
  getPosterUrl: (object: Object) => string | undefined;
  markVideoAsLoaded: (objectKey: string, index: number) => void; // Method to mark videos as loaded

  // Event handlers
  handleTouchStart: (e: React.TouchEvent) => void;
  handleTouchMove: (e: React.TouchEvent) => void;
  handleTouchEnd: () => void;
  handleWheel: (e: React.WheelEvent) => void;
}

// Create singletons to track loaded videos and failure state across component remounts
// These will be shared across all instances of useVideoCarousel
let globalLoadedVideos = new Set<string>();
let globalPreloadedIndices = new Map<string, Map<string, boolean>>(); // Map folder/list ID -> Map of s3fileKey -> loaded status

export function useVideoCarousel({
  objects,
  initialObjectIndex = 0,
  endpoint,
}: UseVideoCarouselProps): UseVideoCarouselReturn {
  // Generate a more stable ID for this list of objects based on their IDs
  const listId = useRef(
    objects.length > 0
      ? objects
          .slice(0, 3)
          .map((obj) => obj.id)
          .join("-")
      : "empty-list"
  ).current;

  let [isOpen, setIsOpen] = useState(false);
  let [currentIndex, setCurrentIndex] = useState(initialObjectIndex);
  let [isPlaying, setIsPlaying] = useState(false);
  let [isScrolling, setIsScrolling] = useState(false);

  // Use the global sets instead of component state to persist across remounts
  let [loadedVideos, setLoadedVideos] =
    useState<Set<string>>(globalLoadedVideos);
  let [preloadedIndices, setPreloadedIndices] = useState<Set<number>>(
    new Set<number>()
  );

  // Initialize our tracking map for this list if it doesn't exist
  useEffect(() => {
    if (!globalPreloadedIndices.has(listId)) {
      globalPreloadedIndices.set(listId, new Map<string, boolean>());
    }

    // Check if any videos in this list are already loaded globally and mark them
    const thisListMap = globalPreloadedIndices.get(listId) as Map<
      string,
      boolean
    >;
    const newPreloadedIndices = new Set<number>();

    objects.forEach((obj, index) => {
      if (globalLoadedVideos.has(obj.s3fileKey)) {
        // This video is already loaded globally, mark it in this list too
        thisListMap.set(obj.s3fileKey, true);
        newPreloadedIndices.add(index);
      }
    });

    setPreloadedIndices(newPreloadedIndices);
  }, [objects, listId]);

  // Create stable URL getters instead of regenerating URLs on every render
  const getVideoSourceUrl = (object: Object) =>
    `${endpoint}${object.s3fileKey}`;
  const getPosterUrl = (object: Object) =>
    object.posterKey ? endpoint + object.posterKey : undefined;

  let videoRef = useRef<HTMLVideoElement | null>(null);
  let containerRef = useRef<HTMLDivElement | null>(null);
  let touchStartY = useRef<number | null>(null);
  let scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const currentObject =
    objects.length > 0 && currentIndex >= 0 ? objects[currentIndex] : null;

  // Function to mark videos as loaded both locally and globally
  const markVideoAsLoaded = (objectKey: string, index: number) => {
    // Add to global set of loaded video keys
    globalLoadedVideos.add(objectKey);
    setLoadedVideos(new Set(globalLoadedVideos));

    // Mark as loaded in this specific list
    const thisListMap = globalPreloadedIndices.get(listId) as Map<
      string,
      boolean
    >;
    thisListMap.set(objectKey, true);

    // Update preloaded indices for current component
    const newPreloadedIndices = new Set(preloadedIndices);
    newPreloadedIndices.add(index);
    setPreloadedIndices(newPreloadedIndices);

    // Important: Also mark this video as preloaded in all other lists that contain it
    globalPreloadedIndices.forEach((listMap, otherListId) => {
      if (otherListId !== listId) {
        listMap.set(objectKey, true);
      }
    });
  };

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
    if (videoRef.current) {
      // Check if the current object is locked
      if (currentObject?.isLocked) {
        // If locked, ensure playback is stopped
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        // Normal playback control for unlocked media
        if (isPlaying) {
          videoRef.current.play().catch(() => setIsPlaying(false));
        } else {
          videoRef.current.pause();
        }
      }
    }
  }, [isPlaying, videoRef.current, currentObject]);

  // Clean up any timeout on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  // Functions for controlling the carousel
  const openModal = (objectIndex: number) => {
    setCurrentIndex(objectIndex);
    setIsOpen(true);

    // Reset isPlaying to false when opening modal
    // It will stay false if the object is locked
    setIsPlaying(false);
  };

  const closeModal = () => {
    setIsOpen(false);
    setIsPlaying(false);

    // Pause and unload the current video when closing
    if (videoRef.current) {
      videoRef.current.pause();
      // Reset source to stop network requests
      if (currentObject && currentObject.kind === "VIDEO") {
        videoRef.current.removeAttribute("src");
        videoRef.current.load();
      }
    }
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
    loadedVideos,
    preloadedIndices,

    // Actions
    openModal,
    closeModal,
    navigateToVideo,
    handleNext,
    handlePrev,
    getVideoSourceUrl,
    getPosterUrl,
    markVideoAsLoaded,

    // Event handlers
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleWheel,
  };
}
