import { ChevronLeft, FolderIcon, Grid, List } from "lucide-react";
import { memo, useRef, useState, useMemo, useCallback } from "react";
import type { FolderWithObjects } from "~/types";
import { formatBytes, getTotalFolderSize } from "~/utils";
import { formatInTimeZone } from "date-fns-tz";
import VideoCarousel from "../carousel/VideoCarousel";
import { useVideoCarousel } from "../carousel/useVideoCarousel";
import ObjectRowLayout from "./ObjectRowLayout";
import ObjectGridLayout from "./ObjectGridLayout";
import { DisplayStyle } from "@prisma/client";
import { Switch } from "@heroui/react";

export interface AccordionItemProps {
  index: number;
  folder: FolderWithObjects;
  isFolderOpen: boolean;
  onClick: () => void;
  passRef: (el: any, key: number) => void;
  endpoint: string;
  readyToLoad?: boolean;
}

// Memoize the object row layout wrapper
const MemoizedObjectRow = memo(({ object, onClick, isLast, endpoint }: any) => (
  <ObjectRowLayout
    key={object.id}
    inAdmin={false}
    onClick={onClick}
    object={object}
    isLast={isLast}
    endpoint={endpoint}
    width={200}
  />
));

// Memoize the object grid layout wrapper
const MemoizedObjectGrid = memo(({ object, onClick, endpoint }: any) => (
  <ObjectGridLayout
    key={object.id}
    onClick={onClick}
    object={object}
    endpoint={endpoint}
  />
));

// Memoize the content components
const AccordionContent = memo(
  ({
    viewMode,
    objects,
    endpoint,
    onObjectClick,
  }: {
    viewMode: DisplayStyle;
    objects: any[];
    endpoint: string;
    onObjectClick: (index: number) => void;
  }) => {
    // Safety check for objects
    if (!objects || objects.length === 0) {
      return (
        <div className="accordion-content p-4 text-gray-500">
          No items to display
        </div>
      );
    }

    if (viewMode === "LIST") {
      return (
        <div className="accordion-content">
          {objects.map((object, objectIndex) => (
            <MemoizedObjectRow
              key={object.id}
              object={object}
              onClick={() => onObjectClick(objectIndex)}
              isLast={objectIndex === objects.length - 1}
              endpoint={endpoint}
            />
          ))}
        </div>
      );
    }

    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4 accordion-content">
        {objects.map((object, objectIndex) => (
          <MemoizedObjectGrid
            key={object.id}
            object={object}
            onClick={() => onObjectClick(objectIndex)}
            endpoint={endpoint}
          />
        ))}
      </div>
    );
  }
);

const SbAccordionItem = memo(
  ({
    index,
    folder,
    passRef,
    isFolderOpen,
    onClick,
    endpoint,
    readyToLoad = false,
  }: AccordionItemProps) => {
    const parentRef = useRef<HTMLDivElement | null>(null);
    const [viewMode, setViewMode] = useState<DisplayStyle>(
      folder?.defaultStyle || DisplayStyle.LIST
    );

    // Safety check for folder
    if (!folder) {
      return null;
    }

    // Memoize the video carousel hook to prevent recreation
    const useVideo = useVideoCarousel({
      objects: folder?.objects || [],
      endpoint: endpoint,
    });

    // Memoize callbacks
    const toggleViewMode = useCallback((view: DisplayStyle) => {
      setViewMode(view);
    }, []);

    const handleObjectClick = useCallback(
      (index: number) => {
        useVideo.openModal(index);
      },
      [useVideo]
    );

    // Memoize formatted dates
    const formattedDate = useMemo(() => {
      if (!folder?.createdDate) {
        return { full: "", date: "", time: "" };
      }
      return {
        full: formatInTimeZone(folder.createdDate, "UTC", "MM.dd.yyyy hh:mm a"),
        date: formatInTimeZone(folder.createdDate, "UTC", "MM.dd.yyyy"),
        time: formatInTimeZone(folder.createdDate, "UTC", "hh:mm a"),
      };
    }, [folder?.createdDate]);

    // Memoize folder size
    const folderSize = useMemo(() => {
      if (!folder?.objects) return "0 B";
      return formatBytes(getTotalFolderSize(folder.objects));
    }, [folder?.objects]);

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
                {formattedDate.full}
              </p>
              <p className="text-center text-xs md:hidden">
                {formattedDate.date}
              </p>
              <p className="text-center text-xs md:hidden">
                {formattedDate.time}
              </p>
            </span>
            <span className="hidden sm:block text-gray-400 text-sm md:text-medium md:group-hover:text-sb-restless">
              {folderSize}
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
                  isSelected={viewMode === "GRID"}
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
              ? "opacity-100 max-h-[100000px]"
              : "opacity-0 max-h-0 pointer-events-none"
          }`}
          aria-hidden={!isFolderOpen}
        >
          {readyToLoad && folder?.objects && (
            <AccordionContent
              viewMode={viewMode}
              objects={folder.objects}
              endpoint={endpoint}
              onObjectClick={handleObjectClick}
            />
          )}
        </div>

        {/* Video carousel is always rendered once loaded, just not visible */}
        {readyToLoad && folder?.objects && (
          <VideoCarousel
            objects={folder.objects}
            endpoint={endpoint}
            useVideo={useVideo}
          />
        )}
      </div>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison function for memo - handle undefined values
    if (!prevProps.folder || !nextProps.folder) {
      return prevProps.folder === nextProps.folder;
    }

    return (
      prevProps.folder.id === nextProps.folder.id &&
      prevProps.isFolderOpen === nextProps.isFolderOpen &&
      prevProps.readyToLoad === nextProps.readyToLoad &&
      prevProps.endpoint === nextProps.endpoint &&
      prevProps.index === nextProps.index &&
      prevProps.folder.objects?.length === nextProps.folder.objects?.length
    );
  }
);

export default SbAccordionItem;
