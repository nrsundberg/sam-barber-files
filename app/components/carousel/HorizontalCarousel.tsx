import React, { useState, useRef, useEffect, memo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Object } from "@prisma/client";
import ObjectGridLayout from "~/components/accordion/ObjectGridLayout";

interface HorizontalCarouselProps {
  title: string;
  objects: Object[];
  endpoint: string;
  onItemClick: (index: number) => void;
}

const HorizontalCarousel: React.FC<HorizontalCarouselProps> = memo(
  ({ title, objects, endpoint, onItemClick }) => {
    const carouselRef = useRef<HTMLDivElement>(null);
    const [showLeftArrow, setShowLeftArrow] = useState(false);
    const [showRightArrow, setShowRightArrow] = useState(false);
    const [visibleRange, setVisibleRange] = useState({ start: 0, end: 5 }); // Only render visible items

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
      setShowLeftArrow(scrollLeft > 5);

      // Only show right arrow if there's more content to scroll
      setShowRightArrow(Math.ceil(scrollLeft + clientWidth) < scrollWidth - 5);

      // Update visible range based on scroll position
      const itemWidth = 320; // Approximate width of each item
      const buffer = 2; // Load 2 items before and after visible range
      const firstVisible = Math.floor(scrollLeft / itemWidth);
      const lastVisible = Math.ceil((scrollLeft + clientWidth) / itemWidth);

      setVisibleRange({
        start: Math.max(0, firstVisible - buffer),
        end: Math.min(objects.length, lastVisible + buffer),
      });
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
                className="carousel-item flex-none w-64 md:w-64 lg:w-[450px] snap-start h-auto"
                data-index={index}
              >
                {/* Only render items within visible range */}
                {index >= visibleRange.start && index < visibleRange.end ? (
                  <div className="w-full h-full flex flex-col">
                    <ObjectGridLayout
                      object={object}
                      onClick={() => onItemClick(index)}
                      endpoint={endpoint}
                      width={320}
                    />
                  </div>
                ) : (
                  // Placeholder to maintain scroll width
                  <div className="w-full h-full" />
                )}
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
  }
);

export default HorizontalCarousel;
