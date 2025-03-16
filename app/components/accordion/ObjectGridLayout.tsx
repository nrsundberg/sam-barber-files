import { Link } from "react-router";
import type { Object } from "@prisma/client";
import { Download, EyeOffIcon } from "lucide-react";
import { Thumbnail } from "../Thumbnail";
import { formatBytes } from "~/utils";
import { Button, Tooltip } from "@heroui/react";
import { formatInTimeZone } from "date-fns-tz";

export default function ({
  object,
  onClick,
  endpoint,
  width,
}: {
  object: Object;
  onClick?: () => void;
  endpoint: string;
  width?: number;
}) {
  return (
    <div
      onClick={onClick ? onClick : undefined}
      key={object.id}
      className={`flex flex-col md:hover:bg-gray-800 transition duration-300 text-gray-400
                  md:hover:text-[#D17885] md:hover:shadow-[0_0_4px_#D17885] group
                  ${object.hidden ? "opacity-60" : ""}`}
    >
      <Thumbnail
        object={object}
        endpoint={endpoint}
        isRow={false}
        width={width}
      />

      {object.hidden && (
        <div className="absolute top-2 right-2 z-10 bg-gray-900 bg-opacity-70 rounded p-1">
          <EyeOffIcon className="w-4 h-4" />
        </div>
      )}

      <div className="flex justify-between items-center mt-auto">
        <div className="text-xs font-light md:text-sm md:font-medium wrap-text">
          {object.fileName || object.s3fileKey.split("/").pop()}
        </div>

        <div className="grid justify-center items-center">
          <div className="md:group-hover:hidden">
            <div className="hidden sm:inline-flex gap-2 bg-gray-700 px-1 md:px-3 md:py-1 text-xs rounded h-fit w-fit text-gray-400 md:group-hover:text-sb-restless">
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
              to={`/data/download/${encodeURIComponent(object.s3fileKey)}`}
              reloadDocument
              size="sm"
              className="bg-sb-banner justify-center md:group-hover:text-sb-restless hidden md:group-hover:flex"
            >
              <Download className="w-5 h-5" />
            </Button>
          </Tooltip>
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
