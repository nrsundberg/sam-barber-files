import { Button, Tooltip } from "@heroui/react";
import type { Object } from "@prisma/client";
import { ChevronLeft, Download, FolderIcon, Music, Video } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import type { FolderWithObjects } from "~/types";
import { formatFileSize, getTotalFolderSize } from "~/utils";
import { formatInTimeZone } from "date-fns-tz";

export interface AccordionItemProps {
  index: number;
  folder: FolderWithObjects;
  isOpen: boolean;
  onClick: () => void;
  passRef: (el: any, key: number) => void;
}

export default function ({
  index,
  folder,
  passRef,
  isOpen,
  onClick,
}: AccordionItemProps) {
  const parentRef = useRef<HTMLDivElement | null>(null);
  const [isSticky, setIsSticky] = useState(false);

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
        className="w-full grid grid-cols-[1.5fr_1fr_.5fr_.5fr] transition p-4 hover:bg-sb-banner hover:text-sb-restless group"
        onClick={onClick}
      >
        <div className="inline-flex items-center gap-x-2 text-lg font-semibold">
          <ChevronLeft
            className={`transform transition-transform duration-300 ${
              isOpen ? "-rotate-90" : "rotate-180"
            }`}
          />
          <FolderIcon />
          {folder.name}
        </div>
        <span className="text-gray-400 group-hover:text-sb-restless">
          {formatInTimeZone(folder.createdDate, "UTC", "MM.dd.yyyy hh:mm a")}
        </span>
        <span className="text-gray-400 group-hover:text-sb-restless">
          {formatFileSize(getTotalFolderSize(folder.objects))}
        </span>
        <div className="grid justify-center">
          <div className="bg-gray-700 px-3 py-1 text-xs rounded w-fit text-gray-400 group-hover:text-sb-restless">
            FOLDER
          </div>
        </div>
      </button>
      <div
        className={`grid transition-[grid-template-rows] duration-300 ${
          isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        } overflow-hidden`}
      >
        <div className="overflow-hidden">
          {folder.objects.map((object) => (
            <RowLayout
              key={object.id}
              object={object}
              isLast={index === folder.objects.length - 1}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function RowLayout({
  object,
  isLast,
  dragHandleProps,
}: {
  object: Object;
  isLast: boolean;
  dragHandleProps?: any;
}) {
  return (
    <div
      //   onClick={onOpen}
      key={object.id}
      className={`flex items-center justify-between py-2 border-b border-gray-500
                       hover:bg-gray-800 transition duration-300 text-gray-400
                        hover:text-[#D17885] hover:shadow-[0_0_4px_#D17885] group ${
                          isLast ? "last-child" : ""
                        }`}
    >
      <div className="w-full px-4 grid grid-cols-[1.5fr_1fr_.5fr_.5fr]">
        <div
          {...dragHandleProps}
          className="pl-6 inline-flex items-center gap-x-2 text-lg font-semibold group-hover:text-sb-restless"
        >
          <ChevronLeft className={"opacity-0"} />
          {object.kind === "AUDIO" ? (
            <Music className="text-blue-400 w-6 h-6" />
          ) : (
            <Video className="text-green-400 w-6 h-6" />
          )}
          {object.fileName}
        </div>
        <p className="text-center">
          {formatInTimeZone(object.createdDate, "UTC", "MM.dd.yyyy hh:mm a")}
        </p>
        <p className="text-center">{formatFileSize(object.size)}</p>

        <div className="grid justify-center">
          <div className="bg-gray-700 px-3 py-1 text-xs rounded w-fit group">
            <span className="group-hover:hidden"> {object.kind}</span>
            <Tooltip
              content="Download"
              className="bg-sb-banner text-sb-restless font-bold"
            >
              <Button
                isIconOnly
                variant="shadow"
                as={Link}
                to={`/download/${object.s3fileKey}`}
                reloadDocument
                size="sm"
                className="bg-sb-banner group-hover:text-sb-restless hidden group-hover:inline"
              >
                <Download className="w-5 h-5" />
              </Button>
            </Tooltip>
          </div>
        </div>
      </div>
    </div>
  );
}
