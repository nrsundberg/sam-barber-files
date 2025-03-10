import { ChevronLeft, FolderIcon, Grid, List } from "lucide-react";
import { useRef, useState } from "react";
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
}

export default function ({
  index,
  folder,
  passRef,
  isFolderOpen,
  onClick,
  endpoint,
}: AccordionItemProps) {
  const parentRef = useRef<HTMLDivElement | null>(null);
  const [viewMode, setViewMode] = useState<DisplayStyle>(folder.defaultStyle);

  const useVideo = useVideoCarousel({
    objects: folder.objects,
    endpoint: endpoint,
  });

  const toggleViewMode = (view: DisplayStyle) => {
    setViewMode(view);
  };

  return (
    <div
      key={folder.id}
      ref={parentRef}
      className={"border-b border-gray-500 z-10 transition-all"}
    >
      <div className="flex items-center w-full">
        <button
          ref={(el) => passRef(el, index)}
          className="flex-1 grid grid-cols-[1.5fr_1fr_.5fr_.5fr] transition p-1 md:p-4 hover:bg-sb-banner hover:text-sb-restless group"
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
          <span className="text-gray-400 text-xs md:text-medium group-hover:text-sb-restless">
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
          <span className="hidden sm:block text-gray-400 text-sm md:text-medium group-hover:text-sb-restless">
            {formatBytes(getTotalFolderSize(folder.objects))}
          </span>
          <div
            className={`hidden sm:block justify-center items-center ${isFolderOpen ? "inline-flex gap-2" : "grid gap-2"}`}
          >
            <div className="bg-gray-700 px-1 md:px-3 h-fit md:py-1 text-xs rounded w-fit text-gray-400 group-hover:text-sb-restless">
              FOLDER
            </div>
            {isFolderOpen && (
              <Switch
                onValueChange={(selected) =>
                  toggleViewMode(
                    selected ? DisplayStyle.LIST : DisplayStyle.GRID
                  )
                }
                checked={viewMode == "GRID"}
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
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <VideoCarousel
        objects={folder.objects}
        endpoint={endpoint}
        useVideo={useVideo}
      />
    </div>
  );
}
