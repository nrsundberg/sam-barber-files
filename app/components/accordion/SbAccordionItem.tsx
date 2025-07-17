import { ChevronLeft, FolderIcon, Grid, List } from "lucide-react";
import { useRef, useState, useEffect } from "react";
import type { FolderWithObjects } from "~/types";
import { formatBytes, getTotalFolderSize } from "~/utils";
import { formatInTimeZone } from "date-fns-tz";
import VideoCarousel from "../carousel/VideoCarousel";
import { useVideoCarousel } from "../carousel/useVideoCarousel";
import ObjectRowLayout from "./ObjectRowLayout";
import ObjectGridLayout from "./ObjectGridLayout";
import { DisplayStyle } from "@prisma/client";
import { Switch } from "@heroui/react";
import { useMediaCache } from "~/contexts/MediaCacheContext";

export interface AccordionItemProps {
  index: number;
  folder: FolderWithObjects;
  isFolderOpen: boolean;
  onClick: () => void;
  passRef: (el: any, key: number) => void;
  endpoint: string;
  readyToLoad?: boolean;
}

export default function SbAccordionItem({
  index,
  folder,
  passRef,
  isFolderOpen,
  onClick,
  endpoint,
  readyToLoad = false,
}: AccordionItemProps) {
  const parentRef = useRef<HTMLDivElement | null>(null);
  const mediaCache = useMediaCache();
  const [viewMode, setViewMode] = useState<DisplayStyle>(folder.defaultStyle);
  const [contentLoaded, setContentLoaded] = useState(false);
  const [hasBeenLoaded, setHasBeenLoaded] = useState(false);
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 10 });

  const useVideo = useVideoCarousel({
    objects: folder.objects,
    endpoint: endpoint,
  });

  const toggleViewMode = (view: DisplayStyle) => {
    setViewMode(view);
  };

  // Load content when folder is open for the first time and app is ready
  useEffect(() => {
    if (isFolderOpen && !contentLoaded && readyToLoad) {
      setContentLoaded(true);
      setHasBeenLoaded(true);

      // Calculate how many items to load initially based on folder size
      const initialCount =
        folder.objects.length > 50 ? 15 : Math.min(folder.objects.length, 25);
      setVisibleRange({ start: 0, end: initialCount - 1 });
    }
  }, [isFolderOpen, contentLoaded, readyToLoad, folder.objects.length]);

  // Set up scroll event listener to load more content as user scrolls
  useEffect(() => {
    if (!isFolderOpen || !contentLoaded) return;

    const handleScroll = () => {
      // Check if we're nearing the end of currently loaded items
      if (parentRef.current) {
        const scrollPosition = window.scrollY + window.innerHeight;
        const parentBottom =
          parentRef.current.getBoundingClientRect().bottom + window.scrollY;

        // If we're within 1000px of the bottom of our current range, load more items
        if (scrollPosition > parentBottom - 1000) {
          setVisibleRange((prev) => {
            const newEnd = Math.min(prev.end + 10, folder.objects.length - 1);
            return { ...prev, end: newEnd };
          });
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isFolderOpen, contentLoaded, folder.objects.length]);

  // Handle load error from child components
  const handleLoadError = (objectId: string) => {
    // Generate cache key for this object
    const object = folder.objects.find((obj) => obj.id === objectId);
    if (!object) return;

    const thumbnailKey = object.posterKey || object.s3fileKey;
    const cacheKey = `${endpoint}${thumbnailKey}`;

    // The error is already tracked in the global cache by the Thumbnail component
    // We just need to check if we should show the item based on retry attempts
    const cacheStatus = mediaCache.getMediaStatus(cacheKey);

    // The MediaCache and Thumbnail component handle retry logic automatically
    // No need to duplicate that logic here
  };

  // Check if thumbnail should be loaded based on cache status
  const shouldLoadThumbnail = (index: number, objectId: string) => {
    // Always load all thumbnails for list view (they're smaller)
    if (viewMode === DisplayStyle.LIST) return true;

    // For grid view, check if within visible range
    return index <= visibleRange.end;
  };

  // Calculate which items should be rendered
  const itemsToRender =
    isFolderOpen && contentLoaded
      ? folder.objects.slice(0, visibleRange.end + 1)
      : [];

  return (
    <div
      key={folder.id}
      ref={parentRef}
      className={"border-b border-gray-500 z-10 transition-all"}
    >
      <div className="flex items-center w-full">
        <button
          ref={(el) => passRef(el, index)}
          className="flex-1 grid grid-cols-2 md:grid-cols-[1.5fr_1fr_.5fr_.5fr] transition p-1 md:p-4 md:hover:bg-sb-banner md:hover:text-sb-restless group"
          onClick={onClick}
        >
          <div className="inline-flex items-center gap-x-2 text-xs md:text-lg font-medium md:font-semibold">
            <ChevronLeft
              className={`transform transition-transform duration-300 ${
                isFolderOpen ? "-rotate-90" : "rotate-180"
              }`}
            />
            <FolderIcon />
            {folder.name}
          </div>
          <span className="text-gray-400 text-xs md:text-medium md:group-hover:text-sb-restless">
            <p className="text-center hidden md:block">
              {formatInTimeZone(
                folder.createdDate,
                "UTC",
                "MM.dd.yyyy hh:mm a"
              )}
            </p>
            <p className="text-center text-xs md:hidden">
              {formatInTimeZone(folder.createdDate, "UTC", "MM.dd.yyyy")}
            </p>
            <p className="text-center text-xs md:hidden">
              {formatInTimeZone(folder.createdDate, "UTC", "hh:mm a")}
            </p>
          </span>
          <span className="hidden sm:block text-gray-400 text-sm md:text-medium md:group-hover:text-sb-restless">
            {formatBytes(getTotalFolderSize(folder.objects))}
          </span>
          <div
            className={`hidden justify-center items-center sm:inline-flex gap-2`}
          >
            <p className="bg-gray-700 px-1 md:px-3 h-fit md:py-1 text-xs rounded w-fit text-gray-400 md:group-hover:text-sb-restless">
              FOLDER
            </p>
            {isFolderOpen && (
              <Switch
                onValueChange={(selected) =>
                  toggleViewMode(
                    selected ? DisplayStyle.GRID : DisplayStyle.LIST
                  )
                }
                isSelected={viewMode == "GRID"}
                color="default"
                className="justify-self-center"
                endContent={<Grid className="w-5 h-5" />}
                startContent={<List className="w-5 h-5" />}
              />
            )}
          </div>
        </button>
      </div>

      {/* Use CSS to hide/show content rather than removing from DOM */}
      <div
        className={`transition-all duration-300 overflow-hidden ${
          isFolderOpen
            ? "opacity-100 max-h-[100000px]" // Large max-height to accommodate any content size
            : "opacity-0 max-h-0 pointer-events-none"
        }`}
        aria-hidden={!isFolderOpen}
      >
        {/* Once content is loaded (even once), it stays in the DOM */}
        {(contentLoaded || hasBeenLoaded) && readyToLoad && (
          <>
            {viewMode == "LIST" ? (
              <div className="accordion-content">
                {itemsToRender.map((object, objectIndex) => (
                  <ObjectRowLayout
                    key={object.id}
                    inAdmin={false}
                    onClick={() => useVideo.openModal(objectIndex)}
                    object={object}
                    isLast={objectIndex === folder.objects.length - 1}
                    endpoint={endpoint}
                    width={200}
                    shouldLoad={shouldLoadThumbnail(objectIndex, object.id)}
                    onError={() => handleLoadError(object.id)}
                  />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4 accordion-content">
                {itemsToRender.map((object, objectIndex) => (
                  <ObjectGridLayout
                    key={object.id}
                    onClick={() => useVideo.openModal(objectIndex)}
                    object={object}
                    endpoint={endpoint}
                    shouldLoad={shouldLoadThumbnail(objectIndex, object.id)}
                    onError={() => handleLoadError(object.id)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Video carousel is always rendered once loaded, just not visible */}
      {(contentLoaded || hasBeenLoaded) && readyToLoad && (
        <VideoCarousel
          objects={folder.objects}
          endpoint={endpoint}
          useVideo={useVideo}
        />
      )}
    </div>
  );
}
