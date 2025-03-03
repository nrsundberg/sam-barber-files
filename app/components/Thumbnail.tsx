import type { Object } from "@prisma/client";
import { formatInTimeZone } from "date-fns-tz";
import { Music, Video } from "lucide-react";

export function Thumbnail({
  object,
  endpoint,
  onClick,
  isRow,
}: {
  object: Object;
  endpoint: string;
  onClick?: () => void;
  isRow?: boolean;
}) {
  return (
    <div className="inline-flex gap-1 md:gap-3" onClick={onClick && onClick}>
      {object.posterKey ? (
        <img src={endpoint + object.posterKey} height={75} width={75} />
      ) : (
        <p>
          {object.kind === "AUDIO" ? (
            <Music className="text-blue-400 w-6 h-6" />
          ) : (
            <Video className="text-green-400 w-6 h-6" />
          )}
        </p>
      )}
      <div className={"flex flex-col"}>
        <p>{object.fileName}</p>
        {isRow ? null : (
          <p>
            {formatInTimeZone(object.createdDate, "UTC", "MM.dd.yyyy hh:mm a")}
          </p>
        )}
      </div>
    </div>
  );
}

//         <div className="text-center items-center flex justify-center">
//           <p className="text-center text-medium hidden md:block">
//             {formatInTimeZone(object.createdDate, "UTC", "MM.dd.yyyy hh:mm a")}
//           </p>
//           <p className="text-center text-xs md:hidden">
//             {formatInTimeZone(object.createdDate, "UTC", "MM.dd.yyyy")}
//           </p>
//           <p className="text-center text-xs md:hidden">
//             {formatInTimeZone(object.createdDate, "UTC", "hh:mm a")}
//           </p>
