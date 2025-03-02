import type { Route } from "./+types/home";
import prisma from "~/db.server";
import { type Object } from "@prisma/client";
import SbAccordion from "~/components/accordion/SbAccordion";
import { cdnEndpoint } from "~/s3.server";
import { Thumbnail } from "~/components/Thumbnail";
import VideoCarousel from "~/components/carousel/VideoCarousel";
import { useState } from "react";
import { useVideoCarousel } from "~/components/carousel/useVideoCarousel";

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

  const { isOpen, openModal, closeModal, currentIndex } = useVideoCarousel({
    objects: favorites,
    endpoint: cdnEndpoint,
  });

  return (
    <div className="min-h-screen mt-1">
      <div className={"px-1 grid auto-rows-auto justify-around mb-1 md:mb-4"}>
        {/*NOTE THIS WILL DISPLAY IF THERE ARE NONE*/}
        {/*IF A NEED TO HAVE NONE CONDI*/}
        {favorites.length > 0 && (
          <div>
            <p>FAVORITES</p>
            <div className={"inline-flex gap-1 md:gap-3"}>
              {favorites.map((object: Object, objectIndex) => (
                <Thumbnail
                  key={object.id}
                  object={object}
                  endpoint={cdnEndpoint}
                  onClick={() => openModal(objectIndex)}
                />
              ))}
            </div>
          </div>
        )}
        <VideoCarousel
          isOpen={isOpen}
          onClose={() => closeModal()}
          objects={favorites}
          initialObjectIndex={currentIndex}
          endpoint={cdnEndpoint}
        />

        {trending.length > 0 && (
          <div>
            <p>TRENDING</p>
            <div className={"inline-flex gap-1 md:gap-3"}>
              {trending.map((object: Object) => (
                <Thumbnail
                  key={object.id}
                  object={object}
                  endpoint={cdnEndpoint}
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
      <SbAccordion folders={folders} endpoint={cdnEndpoint} allowMultiple />
    </div>
  );
}
