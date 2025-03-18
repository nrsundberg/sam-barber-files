import React, { useState, useRef, useEffect } from "react";
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
  const [visibleItems, setVisibleItems] = useState<Set<number>>(new Set());
  const observerRef = useRef<IntersectionObserver | null>(null);

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
  }, [objects]);

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
        rootMargin: "100px", // Load items a bit before they come into view
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
  }, [objects]);

  const scroll = (direction: "left" | "right") => {
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
  };

  const handleScroll = () => {
    if (!carouselRef.current) return;

    const { scrollLeft, scrollWidth, clientWidth } = carouselRef.current;

    // Only show left arrow if we've scrolled to the right
    setShowLeftArrow(scrollLeft > 5); // Small threshold to account for precision issues

    // Only show right arrow if there's more content to scroll
    // Add a small buffer (5px) to handle rounding errors
    setShowRightArrow(Math.ceil(scrollLeft + clientWidth) < scrollWidth - 5);
  };

  // No need to render if there are no objects
  if (objects.length === 0) return null;

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
          {objects.map((object, index) => (
            <div
              key={object.id}
              className="carousel-item flex-none w-64 md:w-64 snap-start h-auto"
              data-index={index}
            >
              <div className="w-full h-full flex flex-col">
                <ObjectGridLayout
                  object={object}
                  onClick={() => onItemClick(index)}
                  endpoint={endpoint}
                  width={320}
                  shouldLoad={visibleItems.has(index) || index < 3} // Always load first 3 items
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
