import type { Route } from "./+types/home";
import prisma from "~/db.server";
import { type Object } from "@prisma/client";
import SbAccordion from "~/components/accordion/SbAccordion";
import { cdnEndpoint } from "~/s3.server";
import { Thumbnail } from "~/components/Thumbnail";
import VideoCarousel from "~/components/carousel/VideoCarousel";
import { useState } from "react";
import { useVideoCarousel } from "~/components/carousel/useVideoCarousel";
import ObjectGridLayout from "~/components/accordion/ObjectGridLayout";

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
  let [folders, favorites, trending, cdnEndpoint] = loaderData;

  const useVideoFavorites = useVideoCarousel({
    objects: favorites,
    endpoint: cdnEndpoint,
  });

  const useVideoTrending = useVideoCarousel({
    objects: trending,
    endpoint: cdnEndpoint,
  });

  return (
    <div className="min-h-screen mt-1">
      <div className={"px-4 grid auto-rows-auto mb-1 md:mb-4"}>
        {favorites.length > 0 && (
          <div>
            <p className="text-2xl font-bold">FAVORITES</p>
            <div className="grid grid-cols-5 gap-1 lg:gap-10">
              {favorites.map((object: Object, objectIndex) => (
                <ObjectGridLayout
                  key={object.id}
                  onClick={() => useVideoFavorites.openModal(objectIndex)}
                  object={object}
                  endpoint={cdnEndpoint}
                  width={350}
                />
              ))}
            </div>
          </div>
        )}
        <VideoCarousel
          objects={favorites}
          endpoint={cdnEndpoint}
          useVideo={useVideoFavorites}
        />

        {trending.length > 0 && (
          <div className="mt-2">
            <p className="text-2xl font-bold">TRENDING</p>
            <div className="grid grid-cols-5 gap-4">
              {trending.map((object: Object, index: number) => (
                <ObjectGridLayout
                  key={object.id}
                  onClick={() => useVideoTrending.openModal(index)}
                  object={object}
                  endpoint={cdnEndpoint}
                  width={350}
                />
              ))}
            </div>
          </div>
        )}
        <VideoCarousel
          objects={trending}
          endpoint={cdnEndpoint}
          useVideo={useVideoTrending}
        />
      </div>

      <div className="w-full text-sm md:text-large px-1 md:px-4 grid grid-cols-[1.5fr_1fr_.5fr_.5fr]">
        <p className="pl-[65px] text-start">NAME</p>
        <p className="text-center">UPLOADED</p>
        <p className="text-center">SIZE</p>
        <p className="text-center">TYPE</p>
      </div>
      <SbAccordion folders={folders} endpoint={cdnEndpoint} allowMultiple />
    </div>
  );
}
