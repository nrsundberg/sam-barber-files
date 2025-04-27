import { Link } from "react-router";
import type { Object } from "@prisma/client";
import { EyeOffIcon } from "lucide-react";
import { Thumbnail } from "../Thumbnail";
import { formatBytes } from "~/utils";
import { formatInTimeZone } from "date-fns-tz";
import AudioToVideoConverter from "~/components/converter/AudioToVideoConverter";

export default function ({
  object,
  onClick,
  endpoint,
  width,
  shouldLoad = false,
  onError,
}: {
  object: Object;
  onClick?: () => void;
  endpoint: string;
  width?: number;
  shouldLoad?: boolean;
  onError?: () => void;
}) {
  return (
    <div
      key={object.id}
      className={`flex flex-col h-full md:hover:bg-gray-800 transition duration-300 text-gray-400
                md:hover:text-sb-restless p-1 md:hover:shadow-[0_0_4px_theme(colors.sb-restless)] group
                ${object.hidden ? " opacity-60" : ""}`}
    >
      <div
        className="relative aspect-video w-full cursor-pointer"
        onClick={onClick ? onClick : undefined}
      >
        <Thumbnail
          object={object}
          endpoint={endpoint}
          isRow={false}
          width={width}
          shouldLoad={shouldLoad}
          onError={onError}
        />

        {object.hidden && (
          <div className="absolute top-2 right-2 z-10 bg-gray-900 bg-opacity-70 rounded p-1">
            <EyeOffIcon className="w-4 h-4" />
          </div>
        )}
      </div>

      <div className="flex justify-between items-center mt-1 min-h-[2.5rem]">
        <div
          className="text-xs font-light md:text-sm md:font-medium line-clamp-2 sm:flex-1 sm:w-full max-w-[70%] sm:max-w-none cursor-pointer"
          onClick={onClick ? onClick : undefined}
        >
          {object.fileName || object.s3fileKey.split("/").pop()}
        </div>

        <div className="grid justify-center items-center">
          <div className="md:group-hover:hidden">
            <div className="hidden sm:inline-flex gap-2 bg-gray-700 px-1 md:px-3 md:py-1 text-xs rounded h-fit w-fit text-gray-400 md:group-hover:text-sb-restless">
              {object.kind}
              {object.hidden && <EyeOffIcon className="w-3 h-3 self-center" />}
            </div>
          </div>
          <div className="gap-2 hidden md:group-hover:flex">
            <Link
              to={`/data/download/${encodeURIComponent(object.s3fileKey)}`}
              reloadDocument
              className="bg-gray-700 px-1 md:px-3 md:py-1 text-xs rounded h-fit w-fit text-gray-400 md:group-hover:text-sb-restless"
              onClick={(e) => e.stopPropagation()} // Prevent the carousel from opening
            >
              Download
            </Link>

            <AudioToVideoConverter object={object} endpoint={endpoint} />
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center text-xs mt-1">
        <span className="hidden sm:block">{formatBytes(object.size)}</span>
        <span className="hidden sm:block">
          {formatInTimeZone(object.createdDate, "UTC", "MM.dd.yyyy")}
        </span>
      </div>
    </div>
  );
}
