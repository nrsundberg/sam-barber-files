import { Button, Tooltip } from "@heroui/react";
import type { Object } from "@prisma/client";
import {
  ChevronLeft,
  Download,
  EyeOffIcon,
  FolderIcon,
  Music,
  Star,
  TrendingUp,
  Video,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useSubmit } from "react-router";
import type { FolderWithObjects } from "~/types";
import { formatBytes, getTotalFolderSize } from "~/utils";
import { formatInTimeZone } from "date-fns-tz";
import VideoCarouselModal from "../carousel/VideoCarousel";

export interface AccordionItemProps {
  index: number;
  folder: FolderWithObjects;
  isOpen: boolean;
  onClick: () => void;
  passRef: (el: any, key: number) => void;
  endpoint: string;
}

export default function ({
  index,
  folder,
  passRef,
  isOpen,
  onClick,
  endpoint,
}: AccordionItemProps) {
  const parentRef = useRef<HTMLDivElement | null>(null);
  let [isSticky, setIsSticky] = useState(false);
  let [videoModalOpen, setVideoModalOpen] = useState(false);
  let [selectedObjectIndex, setSelectedObjectIndex] = useState(0);

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

  // Function to open the video modal with the selected object
  const openVideoModal = (objectIndex: number) => {
    console.log("hello");
    setSelectedObjectIndex(objectIndex);
    setVideoModalOpen(true);
  };

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
              isOpen ? "-rotate-90" : "rotate-180"
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
          isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        } overflow-hidden`}
      >
        <div className="overflow-hidden">
          {folder.objects.map((object, objectIndex) => (
            <RowLayout
              key={object.id}
              inAdmin={false}
              onClick={() => openVideoModal(objectIndex)}
              object={object}
              isLast={index === folder.objects.length - 1}
            />
          ))}
        </div>
      </div>
      {/* Video Carousel Modal */}
      <VideoCarouselModal
        isOpen={videoModalOpen}
        onClose={() => setVideoModalOpen(false)}
        objects={folder.objects}
        initialObjectIndex={selectedObjectIndex}
        endpoint={endpoint}
      />
    </div>
  );
}

export function RowLayout({
  object,
  inAdmin,
  isLast,
  onClick,
  dragHandleProps,
}: {
  object: Object;
  inAdmin: boolean;
  isLast: boolean;
  onClick?: () => void;
  dragHandleProps?: any;
}) {
  let submit = useSubmit();

  const updateTrendingOrFavorite = (trendingField: boolean) => {
    let formData = new FormData();
    formData.set("isTrending", (!object.isTrending).toString());
    formData.set("isFavorite", (!object.isFavorite).toString());

    return submit(formData, {
      method: "POST",
      encType: "multipart/form-data",
      action: `/data/edit/object/${object.id}/${trendingField ? "trending" : "favorite"}`,
      navigate: false,
      preventScrollReset: true,
    });
  };

  return (
    <div
      onClick={onClick ? onClick : undefined}
      key={object.id}
      className={`flex items-center justify-between py-2 border-b border-gray-500
                       hover:bg-gray-800 transition duration-300 text-gray-400
                        hover:text-[#D17885] hover:shadow-[0_0_4px_#D17885] group ${
                          isLast ? "last-child" : ""
                        }`}
    >
      <div
        className={`${object.hidden ? "opacity-60" : ""} w-full px-1 md:px-4 grid grid-cols-[1.5fr_1fr_.5fr_.5fr]`}
      >
        <div
          {...dragHandleProps}
          className="pl-1 md:pl-6 inline-flex items-center gap-x-2 text-xs md:text-lg font-medium md:font-semibold group-hover:text-sb-restless"
        >
          {inAdmin ? (
            <div className={"inline-flex gap-2"}>
              <TrendingUp
                className={`${object.isTrending ? "text-green-500" : ""}`}
                onClickCapture={() => updateTrendingOrFavorite(true)}
              />
              <Star
                className={`${object.isFavorite ? "text-yellow-300" : ""}`}
                onClickCapture={() => updateTrendingOrFavorite(false)}
              />
            </div>
          ) : (
            <ChevronLeft className={"opacity-0"} />
          )}
          {object.kind === "AUDIO" ? (
            <Music className="text-blue-400 w-6 h-6" />
          ) : (
            <Video className="text-green-400 w-6 h-6" />
          )}
          {object.fileName}
        </div>
        <div className="text-center items-center flex justify-center">
          <p className="text-center text-medium hidden md:block">
            {formatInTimeZone(object.createdDate, "UTC", "MM.dd.yyyy hh:mm a")}
          </p>
          <p className="text-center text-xs md:hidden">
            {formatInTimeZone(object.createdDate, "UTC", "MM.dd.yyyy")}
          </p>
          <p className="text-center text-xs md:hidden">
            {formatInTimeZone(object.createdDate, "UTC", "hh:mm a")}
          </p>
        </div>

        <p className="text-center text-sm md:text-medium self-center">
          {formatBytes(object.size)}
        </p>

        <div className="grid justify-center">
          <div className="grid justify-center items-center group-hover:hidden">
            <div className="inline-flex gap-2 bg-gray-700 px-1 md:px-3 md:py-1 text-xs rounded h-fit w-fit text-gray-400 group-hover:text-sb-restless">
              {object.kind}
              {object.hidden && <EyeOffIcon className="w-3 h-3 self-center" />}
            </div>
          </div>
          <Tooltip
            content="Download"
            closeDelay={0}
            className="bg-sb-banner text-sb-restless font-bold"
          >
            <Button
              isIconOnly
              variant="shadow"
              as={Link}
              to={`/download/${object.s3fileKey}`}
              reloadDocument
              size="sm"
              className="bg-sb-banner justify-center group-hover:text-sb-restless hidden group-hover:flex"
            >
              <Download className="w-5 h-5" />
            </Button>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}
