import { Link, useSubmit } from "react-router";
import type { Object } from "@prisma/client";
import {
  ChevronLeft,
  Download,
  EyeOffIcon,
  Star,
  TrendingUp,
} from "lucide-react";
import { Thumbnail } from "../Thumbnail";
import { formatBytes } from "~/utils";
import { Button, Tooltip } from "@heroui/react";
import { formatInTimeZone } from "date-fns-tz";

export default function ({
  object,
  inAdmin,
  isLast,
  onClick,
  dragHandleProps,
  endpoint,
  width,
}: {
  object: Object;
  inAdmin: boolean;
  isLast: boolean;
  onClick?: () => void;
  dragHandleProps?: any;
  endpoint: string;
  width?: number;
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
                       md:hover:bg-gray-800 transition duration-300 text-gray-400
                        md:hover:text-[#D17885] md:hover:shadow-[0_0_4px_#D17885] group ${
                          isLast ? "last-child" : ""
                        }`}
    >
      <div
        className={`${object.hidden ? "opacity-60" : ""} w-full px-1 md:px-4 grid grid-cols-2 md:grid-cols-[1.5fr_1fr_.5fr_.5fr]`}
      >
        <div
          {...dragHandleProps}
          className="pl-1 md:pl-6 inline-flex items-center gap-x-2 text-xs md:text-lg font-medium md:font-semibold md:group-hover:text-sb-restless"
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
          <Thumbnail
            object={object}
            endpoint={endpoint}
            isRow={true}
            width={width ? width : inAdmin ? 150 : undefined}
          />
        </div>

        <p className="hidden sm:block text-center text-sm md:text-medium self-center">
          {formatInTimeZone(object.createdDate, "UTC", "MM.dd.yyyy hh:mm a")}
        </p>

        <div className="flex flex-col gap-3 justify-center items-center sm:hidden">
          <div className="inline-flex bg-gray-700 px-1 text-xs rounded h-fit w-fit text-gray-400">
            {object.kind}
          </div>
          <p className="text-center text-sm md:text-medium self-center">
            {formatInTimeZone(object.createdDate, "UTC", "MM.dd.yyyy hh:mm a")}
          </p>

          <Link
            to={`/data/download/${encodeURIComponent(object.s3fileKey)}`}
            reloadDocument
            className="inline-flex gap-2 bg-gray-700 px-2 py-1 text-xs rounded h-fit w-fit text-sb-restless"
          >
            Download
          </Link>
        </div>

        <p className="hidden sm:block text-center text-sm md:text-medium self-center">
          {formatBytes(object.size)}
        </p>

        <div className="hidden sm:grid justify-center items-center">
          <div className="md:group-hover:hidden">
            <div className="inline-flex gap-2 bg-gray-700 px-1 md:px-3 md:py-1 text-xs rounded h-fit w-fit text-gray-400 md:group-hover:text-sb-restless">
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
    </div>
  );
}
