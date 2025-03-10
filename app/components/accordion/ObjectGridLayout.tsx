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
}: {
  object: Object;
  onClick?: () => void;
  endpoint: string;
}) {
  return (
    <div
      onClick={onClick ? onClick : undefined}
      key={object.id}
      className={`flex flex-col border border-gray-500 rounded-md
                  hover:bg-gray-800 transition duration-300 text-gray-400
                  hover:text-[#D17885] hover:shadow-[0_0_4px_#D17885] group
                  ${object.hidden ? "opacity-60" : ""} p-3 h-full`}
    >
      <div className="relative w-full aspect-video mb-2">
        <Thumbnail object={object} endpoint={endpoint} isRow={false} />

        {object.hidden && (
          <div className="absolute top-2 right-2 z-10 bg-gray-900 bg-opacity-70 rounded p-1">
            <EyeOffIcon className="w-4 h-4" />
          </div>
        )}
      </div>

      <div className="flex justify-between items-center mt-auto">
        <div className="text-sm font-medium truncate max-w-[70%]">
          {object.fileName || object.s3fileKey.split("/").pop()}
        </div>

        <div className="inline-flex gap-2 bg-gray-700 px-2 py-1 text-xs rounded h-fit w-fit text-gray-400">
          {object.kind}
        </div>
      </div>

      <div className="flex justify-between items-center text-xs mt-1">
        <span>{formatBytes(object.size)}</span>
        <span>{formatInTimeZone(object.createdDate, "UTC", "MM.dd.yyyy")}</span>
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
          className="bg-sb-banner justify-center text-sb-restless hidden group-hover:flex mt-2 w-full"
          onClickCapture={(e) => e.stopPropagation()}
        >
          <Download className="w-5 h-5" />
        </Button>
      </Tooltip>
    </div>
  );
}
