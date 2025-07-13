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
  videoRef: React.MutableRefObject<HTMLVideoElement | null>;
  containerRef: React.MutableRefObject<HTMLDivElement | null>;
  setIsPlaying: React.Dispatch<React.SetStateAction<boolean>>;
  loadedVideos: Set<string>;
  preloadedIndices: Set<number>;
  fileErrors: Map<string, { attempts: number; lastAttempt: number }>;
  permanentlyFailedVideos: Set<string>;

  // Actions
  openModal: (objectIndex: number) => void;
  closeModal: () => void;
  navigateToVideo: (index: number) => void;
  handleNext: () => void;
  handlePrev: () => void;
  getVideoSourceUrl: (object: Object) => string;
  getPosterUrl: (object: Object) => string | undefined;
  markVideoAsLoaded: (objectKey: string, index: number) => void;
  markVideoAsError: (objectKey: string, index: number) => void;
  clearVideoError: (objectKey: string) => void;

  // Event handlers
  handleTouchStart: (e: React.TouchEvent) => void;
  handleTouchMove: (e: React.TouchEvent) => void;
  handleTouchEnd: () => void;
  handleWheel: (e: React.WheelEvent) => void;
}

// Create singletons to track loaded videos and failure state across component remounts
const globalLoadedVideos = new Set<string>();
const globalPermanentlyFailedVideos = new Set<string>();
const globalPreloadedIndices = new Map<string, Map<string, boolean>>();

export function useVideoCarousel({
  objects,
  initialObjectIndex = 0,
  endpoint,
}: UseVideoCarouselProps): UseVideoCarouselReturn {
  const listId = useRef(
    objects.length > 0
      ? objects
          .slice(0, 3)
          .map((obj) => obj.id)
          .join("-")
      : "empty-list"
  ).current;

  const [isOpen, setIsOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(initialObjectIndex);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);
  const [loadedVideos, setLoadedVideos] =
    useState<Set<string>>(globalLoadedVideos);
  const [preloadedIndices, setPreloadedIndices] = useState<Set<number>>(
    new Set()
  );
  const [permanentlyFailedVideos, setPermanentlyFailedVideos] = useState<
    Set<string>
  >(globalPermanentlyFailedVideos);
  const [fileErrors, setFileErrors] = useState<
    Map<string, { attempts: number; lastAttempt: number }>
  >(new Map());

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const touchStartY = useRef<number | null>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fileErrorTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const currentObject =
    objects.length > 0 && currentIndex >= 0 ? objects[currentIndex] : null;

  useEffect(() => {
    if (!globalPreloadedIndices.has(listId)) {
      globalPreloadedIndices.set(listId, new Map<string, boolean>());
    }

    const thisListMap = globalPreloadedIndices.get(listId) as Map<
      string,
      boolean
    >;
    const newPreloadedIndices = new Set<number>();

    objects.forEach((obj, index) => {
      if (globalLoadedVideos.has(obj.s3fileKey)) {
        thisListMap.set(obj.s3fileKey, true);
        newPreloadedIndices.add(index);
      }
    });

    setPreloadedIndices(newPreloadedIndices);
  }, [objects, listId]);

  const getVideoSourceUrl = (object: Object) =>
    `${endpoint}${object.s3fileKey}`;
  const getPosterUrl = (object: Object) =>
    object.posterKey ? endpoint + object.posterKey : undefined;

  const markVideoAsLoaded = (objectKey: string, index: number) => {
    if (globalPermanentlyFailedVideos.has(objectKey)) {
      globalPermanentlyFailedVideos.delete(objectKey);
      setPermanentlyFailedVideos(new Set(globalPermanentlyFailedVideos));
    }

    globalLoadedVideos.add(objectKey);
    setLoadedVideos(new Set(globalLoadedVideos));

    const thisListMap = globalPreloadedIndices.get(listId) as Map<
      string,
      boolean
    >;
    thisListMap.set(objectKey, true);

    const newPreloadedIndices = new Set(preloadedIndices);
    newPreloadedIndices.add(index);
    setPreloadedIndices(newPreloadedIndices);

    clearVideoError(objectKey);

    globalPreloadedIndices.forEach((listMap, otherListId) => {
      if (otherListId !== listId) {
        listMap.set(objectKey, true);
      }
    });
  };

  const markVideoAsError = (objectKey: string, index: number) => {
    if (globalPermanentlyFailedVideos.has(objectKey)) {
      return;
    }

    setFileErrors((prev) => {
      const newMap = new Map(prev);
      const current = prev.get(objectKey);
      const attempts = current ? current.attempts + 1 : 1;

      if (attempts >= 5) {
        console.log(
          `Video permanently failed after ${attempts} attempts: ${objectKey}`
        );
        globalPermanentlyFailedVideos.add(objectKey);
        setPermanentlyFailedVideos(new Set(globalPermanentlyFailedVideos));

        if (fileErrorTimeouts.current.has(objectKey)) {
          clearTimeout(fileErrorTimeouts.current.get(objectKey));
          fileErrorTimeouts.current.delete(objectKey);
        }
      }

      newMap.set(objectKey, {
        attempts,
        lastAttempt: Date.now(),
      });
      return newMap;
    });

    const currentAttempts = fileErrors.get(objectKey)?.attempts || 0;
    if (currentAttempts < 4) {
      if (fileErrorTimeouts.current.has(objectKey)) {
        clearTimeout(fileErrorTimeouts.current.get(objectKey));
      }

      const delay = Math.min(1000 * Math.pow(2, currentAttempts), 30000);
      const timeoutId = setTimeout(() => {
        clearVideoError(objectKey);
      }, delay);

      fileErrorTimeouts.current.set(objectKey, timeoutId);
    }
  };

  const clearVideoError = (objectKey: string) => {
    if (globalPermanentlyFailedVideos.has(objectKey)) {
      return;
    }

    setFileErrors((prev) => {
      const newMap = new Map(prev);
      newMap.delete(objectKey);
      return newMap;
    });

    if (fileErrorTimeouts.current.has(objectKey)) {
      clearTimeout(fileErrorTimeouts.current.get(objectKey));
      fileErrorTimeouts.current.delete(objectKey);
    }
  };

  useEffect(() => {
    if (!isOpen) {
      setIsPlaying(false);
    }
  }, [isOpen]);

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

  useEffect(() => {
    if (videoRef.current && currentObject) {
      if (currentObject.isLocked) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        if (isPlaying) {
          videoRef.current.play().catch(() => setIsPlaying(false));
        } else {
          videoRef.current.pause();
        }
      }
    }
  }, [isPlaying, currentObject]);

  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      fileErrorTimeouts.current.forEach((timeout) => {
        clearTimeout(timeout);
      });
      fileErrorTimeouts.current.clear();
    };
  }, []);

  const openModal = (objectIndex: number) => {
    setCurrentIndex(objectIndex);
    setIsOpen(true);
    setIsPlaying(false);
  };

  const closeModal = () => {
    setIsOpen(false);
    setIsPlaying(false);

    if (videoRef.current && currentObject && currentObject.kind === "VIDEO") {
      videoRef.current.pause();
      videoRef.current.removeAttribute("src");
      videoRef.current.load();
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
        handleNext();
      } else {
        handlePrev();
      }
      touchStartY.current = null;

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
      handleNext();
    } else {
      handlePrev();
    }
  };

  return {
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
    fileErrors,
    permanentlyFailedVideos,
    openModal,
    closeModal,
    navigateToVideo,
    handleNext,
    handlePrev,
    getVideoSourceUrl,
    getPosterUrl,
    markVideoAsLoaded,
    markVideoAsError,
    clearVideoError,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleWheel,
  };
}
