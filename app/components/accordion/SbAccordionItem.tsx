import { ChevronLeft, FolderIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { FolderWithObjects } from "~/types";
import { formatBytes, getTotalFolderSize } from "~/utils";
import { formatInTimeZone } from "date-fns-tz";
import VideoCarousel from "../carousel/VideoCarousel";
import { useVideoCarousel } from "../carousel/useVideoCarousel";
import ObjectRowLayout from "./ObjectRowLayout";

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
  let [isSticky, setIsSticky] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (!parentRef.current) return;

      const parentTop = parentRef.current.getBoundingClientRect().top;
      const lastChild = parentRef.current.querySelector(".last-child");

      if (lastChild) {
        const lastChildBottom = lastChild.getBoundingClientRect().bottom;

        if (parentTop <= 0 && lastChildBottom > window.innerHeight) {
          setIsSticky(true);
        } else {
          setIsSticky(false);
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const { isOpen, openModal, closeModal, currentIndex } = useVideoCarousel({
    objects: folder.objects,
    endpoint: endpoint,
  });

  return (
    <div
      key={folder.id}
      ref={parentRef}
      className={`border-b border-gray-500 z-10 transition-all ${
        isSticky ? "fixed top-0 left-0 right-0 shadow-lg" : "relative"
      }`}
    >
      <button
        ref={(el) => passRef(el, index)}
        className="w-full grid grid-cols-[1.5fr_1fr_.5fr_.5fr] transition p-1 md:p-4 hover:bg-sb-banner hover:text-sb-restless group"
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
            {formatInTimeZone(folder.createdDate, "UTC", "MM.dd.yyyy hh:mm a")}
          </p>
          <p className="text-center text-xs md:hidden">
            {formatInTimeZone(folder.createdDate, "UTC", "MM.dd.yyyy")}
          </p>
          <p className="text-center text-xs md:hidden">
            {formatInTimeZone(folder.createdDate, "UTC", "hh:mm a")}
          </p>
        </span>
        <span className="text-gray-400 text-sm md:text-medium group-hover:text-sb-restless">
          {formatBytes(getTotalFolderSize(folder.objects))}
        </span>
        <div className="grid justify-center items-center">
          <div className="bg-gray-700 px-1 md:px-3 h-fit md:py-1 text-xs rounded w-fit text-gray-400 group-hover:text-sb-restless">
            FOLDER
          </div>
        </div>
      </button>
      <div
        className={`grid transition-[grid-template-rows] duration-300 ${
          isFolderOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        } overflow-hidden`}
      >
        <div className="overflow-hidden">
          {folder.objects.map((object, objectIndex) => (
            <ObjectRowLayout
              key={object.id}
              inAdmin={false}
              onClick={() => openModal(objectIndex)}
              object={object}
              isLast={index === folder.objects.length - 1}
              endpoint={endpoint}
            />
          ))}
        </div>
      </div>
      <VideoCarousel
        isOpen={isOpen}
        onClose={() => closeModal()}
        objects={folder.objects}
        initialObjectIndex={currentIndex}
        endpoint={endpoint}
      />
    </div>
  );
}
