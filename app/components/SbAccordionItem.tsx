import { Button, Tooltip } from "@heroui/react";
import type { Prisma } from "@prisma/client";
import { format } from "date-fns";
import { ChevronLeft, Download, FolderIcon, Music, Video } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { formatFileSize, getTotalFolderSize } from "~/utils";

export interface AccordionItemProps {
  index: number;
  folder: Prisma.FolderGetPayload<{
    include: { objects: true };
  }>;
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
      className={`border-b border-gray-300 z-10 transition-all ${
        isSticky ? "fixed top-0 left-0 right-0 shadow-lg" : "relative"
      }`}
    >
      <button
        ref={(el) => passRef(el, index)}
        className="w-full grid grid-cols-[1.5fr_1fr_.5fr_.5fr] transition p-4 hover:bg-sb-banner hover:text-sb-restless"
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
        <span className="text-gray-400">
          {format(new Date(folder.createdDate), "MM.dd.yyyy hh:mm a")}
        </span>
        <span className="text-gray-400">
          {formatFileSize(getTotalFolderSize(folder.objects))}
        </span>
        <div className="grid justify-center">
          <div className="bg-gray-700 px-3 py-1 text-xs rounded w-fit">
            Folder
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
            <div
              //   onClick={onOpen}
              key={object.id}
              className={`pl-10 flex items-center justify-between py-2
                       hover:bg-gray-800 transition duration-300 text-gray-400
                        hover:text-[#D17885] hover:shadow-[0_0_4px_#D17885] group ${
                          index === folder.objects.length - 1
                            ? "last-child"
                            : ""
                        }`}
            >
              <div className="flex items-center gap-4">
                {object.kind === "AUDIO" ? (
                  <Music className="text-blue-400 w-6 h-6" />
                ) : (
                  <Video className="text-green-400 w-6 h-6" />
                )}
                <span className="text-white group-hover:text-[#D17885]">
                  {object.fileName}
                </span>
              </div>
              <div className="w-[400px] grid grid-cols-[150px_150px_100px] text-sm text-center">
                <p className="self-center">
                  {format(new Date(object.createdDate), "MM.dd.yyyy hh:mm a")}
                </p>
                <p className="self-center">{formatFileSize(object.size)}</p>
                <div className="flex justify-end pr-1">
                  <Tooltip content="Download">
                    <Button
                      isIconOnly
                      variant="shadow"
                      as={Link}
                      to={`/download/${object.s3fileKey}`}
                      reloadDocument
                      className="bg-sb-banner hover:bg-green-200 text-white hover:text-black"
                    >
                      <Download className="w-5 h-5" />
                    </Button>
                  </Tooltip>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
