import type { Object } from "@prisma/client";
import { Camera, Music, Video } from "lucide-react";

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
        />
      ) : (
        <div className="items-center flex h-full justify-center">
          {object.kind === "AUDIO" ? (
            <Music className="text-blue-400 w-[50px] h-[50px]" />
          ) : object.kind === "PHOTO" ? (
            <Camera className="text-green-400 w-[50px] h-[50px]" />
          ) : (
            <Video className="text-green-400 w-[50px] h-[50px]" />
          )}
        </div>
      )}
      {!isRow ? null : <p className="self-center">{object.fileName}</p>}
    </div>
  );
}
