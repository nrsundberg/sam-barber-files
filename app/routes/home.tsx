import type { Route } from "./+types/home";
import prisma from "~/db.server";
import SbAccordion from "~/components/accordion/SbAccordion";
import { cdnEndpoint } from "~/s3.server";
import VideoCarousel from "~/components/carousel/VideoCarousel";
import { useState, useEffect } from "react";
import { useVideoCarousel } from "~/components/carousel/useVideoCarousel";
import HorizontalCarousel from "~/components/carousel/HorizontalCarousel";
import { data } from "react-router";

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
    where: { isFavorite: true, hidden: false },
  });
  let trending = prisma.object.findMany({
    where: { isTrending: true, hidden: false },
  });
  let folders = prisma.folder.findMany({
    where: { hidden: false },
    orderBy: { folderPosition: "asc" },
    include: {
      objects: {
        where: { hidden: false },
        orderBy: { filePosition: "asc" },
      },
    },
  });

  const result = await Promise.all([folders, favorites, trending, cdnEndpoint]);

  // Add cache control headers (30 minutes cache)
  return data(result, {
    headers: {
      "Cache-Control": "public, max-age=1800", // 30 minutes
      Expires: new Date(Date.now() + 1800000).toUTCString(),
    },
  });
}

export default function ({ loaderData }: Route.ComponentProps) {
  let [folders, favorites, trending, cdnEndpoint] = loaderData;
  let [initialLoadComplete, setInitialLoadComplete] = useState(false);

  const useVideoFavorites = useVideoCarousel({
    objects: favorites,
    endpoint: cdnEndpoint,
  });

  const useVideoTrending = useVideoCarousel({
    objects: trending,
    endpoint: cdnEndpoint,
  });

  // Flag to prioritize loading favorites and trending first
  useEffect(() => {
    if (!initialLoadComplete) {
      // Set a small timeout to ensure the page has rendered first
      const timer = setTimeout(() => {
        setInitialLoadComplete(true);
      }, 100);

      return () => clearTimeout(timer);
    }
  }, []);

  return (
    <div className="min-h-screen mt-1">
      <div className={"mb-1 md:mb-4"}>
        {favorites.length > 0 && (
          <HorizontalCarousel
            title="FAVORITES"
            objects={favorites}
            endpoint={cdnEndpoint}
            onItemClick={(index) => useVideoFavorites.openModal(index)}
          />
        )}
        <VideoCarousel
          objects={favorites}
          endpoint={cdnEndpoint}
          useVideo={useVideoFavorites}
        />

        {trending.length > 0 && (
          <HorizontalCarousel
            title="TRENDING"
            objects={trending}
            endpoint={cdnEndpoint}
            onItemClick={(index) => useVideoTrending.openModal(index)}
          />
        )}
        <VideoCarousel
          objects={trending}
          endpoint={cdnEndpoint}
          useVideo={useVideoTrending}
        />
      </div>

      <div className="w-full text-sm md:text-large px-1 md:px-4 grid grid-cols-2 md:grid-cols-[1.5fr_1fr_.5fr_.5fr]">
        <p className="pl-[65px] text-start">NAME</p>
        <p className="text-center">UPLOADED</p>
        <p className="hidden sm:block text-center">SIZE</p>
        <p className="hidden sm:block text-center">TYPE</p>
      </div>

      {/* Only pass initialLoadComplete to ensure accordions load after favorites/trending */}
      <SbAccordion
        folders={folders}
        endpoint={cdnEndpoint}
        allowMultiple
        initialLoadComplete={initialLoadComplete}
      />
    </div>
  );
}
