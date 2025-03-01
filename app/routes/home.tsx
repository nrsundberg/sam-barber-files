import type { Route } from "./+types/home";
import prisma from "~/db.server";
import { ObjectKind, type Object } from "@prisma/client";
import SbAccordion from "~/components/accordion/SbAccordion";
import { Music, Video } from "lucide-react";
import { formatInTimeZone } from "date-fns-tz";
import { cdnEndpoint } from "~/s3.server";

export function meta() {
  return [
    { title: "Sam Barber Files" },
    {
      property: "og:title",
      content: "Sam Barber Files",
    },
    {
      name: "description",
      content: "Where fans find what they need to know.",
    },
  ];
}

// NOTE: Revolving banner in the top of the page -- start black and on scroll go and turn white

export async function loader({}: Route.LoaderArgs) {
  // NOTE: limited to five in each
  let favorites = prisma.object.findMany({
    where: { isFavorite: true },
    take: 5,
  });
  let trending = prisma.object.findMany({
    where: { isTrending: true },
    take: 5,
  });
  let folders = prisma.folder.findMany({
    where: { hidden: false },
    orderBy: { folderPosition: "asc" },
    include: {
      objects: { where: { hidden: false }, orderBy: { filePosition: "asc" } },
    },
  });
  return Promise.all([folders, favorites, trending, cdnEndpoint]);
}

export default function ({ loaderData }: Route.ComponentProps) {
  let [folders, favorites, trending, cdn_endpoint] = loaderData;

  return (
    <div className="min-h-screen mt-1">
      <div className={"px-1 grid auto-rows-auto justify-around mb-1 md:mb-4"}>
        {/*NOTE THIS WILL DISPLAY IF THERE ARE NONE*/}
        {/*IF A NEED TO HAVE NONE CONDI*/}
        {favorites.length > 0 && (
          <div>
            <p>FAVORITES</p>
            <div className={"inline-flex gap-1 md:gap-3"}>
              {favorites.map((object: Object) => (
                <ThumbnailObject
                  key={object.id}
                  object={object}
                  endpoint={cdn_endpoint}
                />
              ))}
            </div>
          </div>
        )}
        {trending.length > 0 && (
          <div>
            <p>TRENDING</p>
            <div className={"inline-flex gap-1 md:gap-3"}>
              {trending.map((object: Object) => (
                <ThumbnailObject
                  key={object.id}
                  object={object}
                  endpoint={cdn_endpoint}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="w-full text-sm md:text-large px-1 md:px-4 grid grid-cols-[1.5fr_1fr_.5fr_.5fr]">
        <p className="pl-[65px] text-start">NAME</p>
        <p className="text-center">UPLOADED</p>
        <p className="text-center">SIZE</p>
        <p className="text-center">TYPE</p>
      </div>
      <SbAccordion folders={folders} allowMultiple />
    </div>
  );
}

function ThumbnailObject({
  object,
  endpoint,
}: {
  object: Object;
  endpoint: string;
}) {
  return (
    <div className={"flex flex-col"}>
      {object.posterKey ? (
        <img src={endpoint + object.posterKey} height={50} width={50} />
      ) : (
        <p>
          {object.kind === "AUDIO" ? (
            <Music className="text-blue-400 w-6 h-6" />
          ) : (
            <Video className="text-green-400 w-6 h-6" />
          )}
        </p>
      )}
      <p>{object.fileName}</p>
      <p>{formatInTimeZone(object.createdDate, "UTC", "MM.dd.yyyy hh:mm a")}</p>
    </div>
  );
}

function VideoPopup({
  objects,
  currentObjectId,
  cloudfrontUrl,
}: {
  objects: Object[];
  currentObjectId: string;
  cloudfrontUrl: string;
}) {
  let currentObject = objects.find((it) => it.id === currentObjectId);
  return currentObject?.kind === ObjectKind.AUDIO ? (
    <audio src={cloudfrontUrl + `/${currentObject?.s3fileKey}`} />
  ) : (
    <video
      width="640"
      height="1/4lvh"
      controls
      poster={cloudfrontUrl + `/${currentObject?.posterKey}`}
    >
      <source
        src={cloudfrontUrl + `/${currentObject?.s3fileKey}`}
        type="video/mp4"
      />
      Your browser does not support the video tag.
    </video>
  );
}
