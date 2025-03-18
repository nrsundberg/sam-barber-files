// Thumbnail.tsx - Modified version
import type { Object } from "@prisma/client";
import { AudioLines } from "lucide-react";

export function Thumbnail({
  object,
  endpoint,
  onClick,
  isRow,
  height,
  width,
}: {
  object: Object;
  endpoint: string;
  onClick?: () => void;
  isRow?: boolean;
  height?: number;
  width?: number;
}) {
  return (
    <div
      className={"align-middle w-full h-full items-center"}
      onClick={onClick && onClick}
    >
      {object.posterKey ? (
        <img
          src={endpoint + object.posterKey}
          height={height}
          width={width}
          className="max-w-[100px] sm:max-w-full"
          loading="lazy"
        />
      ) : (
        <div className="items-center flex h-full justify-center">
          {object.kind === "AUDIO" ? (
            <AudioLines className="text-gray-400 w-[75px] h-[75px]" />
          ) : object.kind === "PHOTO" ? (
            <img
              src={endpoint + object.s3fileKey}
              loading="lazy"
              className="w-full h-full object-contain"
            />
          ) : (
            <video
              preload="metadata"
              src={endpoint + object.s3fileKey}
              className="w-full h-full object-contain"
            />
          )}
        </div>
      )}
      {!isRow ? null : <p className="self-center">{object.fileName}</p>}
    </div>
  );
}
