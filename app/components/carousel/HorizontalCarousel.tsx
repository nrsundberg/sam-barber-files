import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Object } from "@prisma/client";
import ObjectGridLayout from "~/components/accordion/ObjectGridLayout";

interface HorizontalCarouselProps {
  title: string;
  objects: Object[];
  endpoint: string;
  onItemClick: (index: number) => void;
}

const HorizontalCarousel: React.FC<HorizontalCarouselProps> = ({
  title,
  objects,
  endpoint,
  onItemClick,
}) => {
  const carouselRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);
  const [visibleItems, setVisibleItems] = useState<Set<number>>(
    new Set([0, 1, 2])
  ); // Preload first 3 items
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Add state to track item errors
  const [itemErrors, setItemErrors] = useState<
    Record<string, { timestamp: number; attempts: number }>
  >({});
  const errorTimeoutsRef = useRef<Record<string, NodeJS.Timeout>>({});

  // Memoize objects to prevent re-renders on scroll
  const memoizedObjects = useMemo(() => objects, [objects]);

  // Memoize the onItemClick to prevent re-renders
  const memoizedOnItemClick = useCallback(
    (index: number) => {
      onItemClick(index);
    },
    [onItemClick]
  );

  // Check if arrows should be displayed initially and on resize
  useEffect(() => {
    const checkArrows = () => {
      if (!carouselRef.current) return;

      const { scrollLeft, scrollWidth, clientWidth } = carouselRef.current;

      // Only show right arrow if there's content overflowing
      setShowRightArrow(scrollWidth > clientWidth);

      // Only show left arrow if we've scrolled to the right
      setShowLeftArrow(scrollLeft > 0);
    };

    // Run on mount
    checkArrows();

    // Run on window resize
    window.addEventListener("resize", checkArrows);
    return () => window.removeEventListener("resize", checkArrows);
  }, [memoizedObjects]);

  // Setup intersection observer for lazy loading
  useEffect(() => {
    // Cleanup previous observer
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    // Create new observer for lazy loading
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = parseInt(
              entry.target.getAttribute("data-index") || "0",
              10
            );
            setVisibleItems((prev) => {
              const updated = new Set(prev);
              updated.add(index);
              return updated;
            });
          }
        });
      },
      {
        root: carouselRef.current,
        rootMargin: "200px", // Increased loading range
        threshold: 0.1,
      }
    );

    // Add observed items
    const itemElements =
      carouselRef.current?.querySelectorAll(".carousel-item");
    if (itemElements) {
      itemElements.forEach((el) => observerRef.current?.observe(el));
    }

    return () => {
      observerRef.current?.disconnect();
    };
  }, [memoizedObjects]);

  // Clean up timeouts when unmounting
  useEffect(() => {
    return () => {
      // Clear all timeouts when component unmounts
      Object.values(errorTimeoutsRef.current).forEach((timeoutId) => {
        clearTimeout(timeoutId);
      });
    };
  }, []);

  const handleItemError = (objectId: string) => {
    setItemErrors((prev) => {
      const now = Date.now();
      const current = prev[objectId] || { timestamp: now, attempts: 0 };

      // Don't retry if we've failed recently (within 5 seconds)
      if (current.timestamp && now - current.timestamp < 5000) {
        return prev;
      }

      // Clear any existing timeout
      if (errorTimeoutsRef.current[objectId]) {
        clearTimeout(errorTimeoutsRef.current[objectId]);
      }

      const nextAttempts = current.attempts + 1;

      // Only retry up to 3 times (reduced from 5)
      if (nextAttempts < 3) {
        const delay = Math.min(2000 * Math.pow(2, current.attempts), 30000);

        errorTimeoutsRef.current[objectId] = setTimeout(() => {
          setItemErrors((current) => {
            const updated = { ...current };
            delete updated[objectId];
            return updated;
          });

          setVisibleItems((prev) => {
            const updated = new Set(prev);
            updated.delete(parseInt(objectId));
            return updated;
          });
        }, delay);
      }

      return {
        ...prev,
        [objectId]: {
          timestamp: now,
          attempts: nextAttempts,
        },
      };
    });
  };

  // Memoized scroll function
  const scroll = useCallback((direction: "left" | "right") => {
    if (!carouselRef.current) return;

    const scrollAmount = carouselRef.current.clientWidth * 0.8;
    const newScrollLeft =
      direction === "left"
        ? carouselRef.current.scrollLeft - scrollAmount
        : carouselRef.current.scrollLeft + scrollAmount;

    carouselRef.current.scrollTo({
      left: newScrollLeft,
      behavior: "smooth",
    });
  }, []);

  // Memoized scroll handler to prevent re-renders
  const handleScroll = useCallback(() => {
    if (!carouselRef.current) return;

    const { scrollLeft, scrollWidth, clientWidth } = carouselRef.current;

    // Only show left arrow if we've scrolled to the right
    setShowLeftArrow(scrollLeft > 5); // Small threshold to account for precision issues

    // Only show right arrow if there's more content to scroll
    // Add a small buffer (5px) to handle rounding errors
    setShowRightArrow(Math.ceil(scrollLeft + clientWidth) < scrollWidth - 5);

    // Check if we should load more items as we scroll
    const scrollPosition = scrollLeft + clientWidth;
    const scrollPercentage = scrollPosition / scrollWidth;

    // If we're more than 70% through the scrollable area, preload more items
    if (scrollPercentage > 0.7) {
      const currentlyVisibleIndices = Array.from(visibleItems);
      const maxVisible = Math.max(...currentlyVisibleIndices);

      if (maxVisible < memoizedObjects.length - 1) {
        // Preload a few more items
        const newVisibleItems = new Set(visibleItems);
        for (
          let i = maxVisible + 1;
          i <= Math.min(maxVisible + 3, memoizedObjects.length - 1);
          i++
        ) {
          newVisibleItems.add(i);
        }
        setVisibleItems(newVisibleItems);
      }
    }
  }, [visibleItems, memoizedObjects.length]);

  // Memoized helper function to determine if an item should load
  const shouldItemLoad = useCallback(
    (index: number, objectId: string) => {
      // Don't load items with too many failed attempts
      const errorInfo = itemErrors[objectId];
      if (errorInfo && errorInfo.attempts >= 5) return false;

      // Don't load items that are currently in error state and waiting for retry
      if (errorInfo) return false;

      // Otherwise load if visible or one of the first 3 items
      return visibleItems.has(index) || index < 3;
    },
    [itemErrors, visibleItems]
  );

  // No need to render if there are no objects
  if (memoizedObjects.length === 0) return null;

  return (
    <div className="w-full my-6 px-4">
      <p className="text-medium md:text-xl font-bold mb-3">{title}</p>

      <div className="relative w-full">
        {/* Left arrow - only shown when scrolled right */}
        {showLeftArrow && (
          <button
            onClick={() => scroll("left")}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 rounded-full p-2 text-white hover:bg-opacity-90 transition"
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        {/* Carousel container */}
        <div
          ref={carouselRef}
          className="flex overflow-x-auto scrollbar-hide gap-4 py-2 scroll-smooth snap-x pb-4"
          onScroll={handleScroll}
        >
          {memoizedObjects.map((object, index) => (
            <div
              key={`${object.id}-${index}`} // Stable key
              className="carousel-item flex-none w-64 md:w-64 lg:w-[450px] snap-start h-auto"
              data-index={index}
            >
              <div className="w-full h-full flex flex-col">
                <ObjectGridLayout
                  object={object}
                  onClick={() => memoizedOnItemClick(index)}
                  endpoint={endpoint}
                  width={320}
                  shouldLoad={shouldItemLoad(index, object.id)}
                  onError={() => handleItemError(object.id)}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Right arrow - only shown when there's more content to the right */}
        {showRightArrow && (
          <button
            onClick={() => scroll("right")}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-gray-900 bg-opacity-70 rounded-full p-2 text-white hover:bg-opacity-90 transition"
            aria-label="Scroll right"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}
      </div>
    </div>
  );
};

export default HorizontalCarousel;
