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

export interface AccordionItemProps {
  index: number;
  folder: FolderWithObjects;
  isFolderOpen: boolean;
  onClick: () => void;
  passRef: (el: any, key: number) => void;
  endpoint: string;
  readyToLoad?: boolean; // Add readyToLoad prop
}

export default function ({
  index,
  folder,
  passRef,
  isFolderOpen,
  onClick,
  endpoint,
  readyToLoad = false,
}: AccordionItemProps) {
  const parentRef = useRef<HTMLDivElement | null>(null);
  const [viewMode, setViewMode] = useState<DisplayStyle>(folder.defaultStyle);
  const [contentLoaded, setContentLoaded] = useState(false);

  const useVideo = useVideoCarousel({
    objects: folder.objects,
    endpoint: endpoint,
  });

  const toggleViewMode = (view: DisplayStyle) => {
    setViewMode(view);
  };

  // Only load content when folder is open for the first time and when app is ready to load accordion content
  useEffect(() => {
    if (isFolderOpen && !contentLoaded && readyToLoad) {
      setContentLoaded(true);
    }
  }, [isFolderOpen, contentLoaded, readyToLoad]);

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
                isSelected={viewMode === DisplayStyle.GRID}
                color="default"
                className="justify-self-center"
                endContent={<Grid className="w-5 h-5" />}
                startContent={<List className="w-5 h-5" />}
              />
            )}
          </div>
        </button>
      </div>

      <div
        className={`transition-[grid-template-rows] duration-300 ${
          isFolderOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        } grid overflow-hidden`}
      >
        <div className="overflow-hidden">
          {/* Only render content if folder has been opened at least once and app is ready to load accordion content */}
          {contentLoaded && readyToLoad && (
            <>
              {viewMode == "LIST" ? (
                folder.objects.map((object, objectIndex) => (
                  <ObjectRowLayout
                    key={object.id}
                    inAdmin={false}
                    onClick={() => useVideo.openModal(objectIndex)}
                    object={object}
                    isLast={objectIndex === folder.objects.length - 1}
                    endpoint={endpoint}
                    width={200}
                    shouldLoad={isFolderOpen} // Only load when folder is open
                  />
                ))
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
                  {folder.objects.map((object, objectIndex) => (
                    <ObjectGridLayout
                      key={object.id}
                      onClick={() => useVideo.openModal(objectIndex)}
                      object={object}
                      endpoint={endpoint}
                      shouldLoad={isFolderOpen} // Only load when folder is open
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Only pass video data when it has been opened once and app is ready to load accordion content */}
      {contentLoaded && readyToLoad && (
        <VideoCarousel
          objects={folder.objects}
          endpoint={endpoint}
          useVideo={useVideo}
        />
      )}
    </div>
  );
}
