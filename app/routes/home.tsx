import type { Route } from "./+types/home";
import prisma from "~/db.server";
import SbAccordion from "~/components/accordion/SbAccordion";
import { cdnEndpoint } from "~/s3.server";
import VideoCarousel from "~/components/carousel/VideoCarousel";
import { useMemo } from "react";
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

export async function loader({}: Route.LoaderArgs) {
  let favorites = prisma.object.findMany({
    where: { isFavorite: true, hidden: false },
    orderBy: { favoritePosition: "asc" },
  });
  let trending = prisma.object.findMany({
    where: { isTrending: true, hidden: false },
    orderBy: { trendingPosition: "asc" },
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

  // Memoize data to prevent unnecessary re-renders
  const memoizedFavorites = useMemo(() => favorites, [favorites]);
  const memoizedTrending = useMemo(() => trending, [trending]);
  const memoizedFolders = useMemo(() => folders, [folders]);

  const useVideoFavorites = useVideoCarousel({
    objects: memoizedFavorites,
    endpoint: cdnEndpoint,
  });

  const useVideoTrending = useVideoCarousel({
    objects: memoizedTrending,
    endpoint: cdnEndpoint,
  });

  return (
    <div className="min-h-screen mt-1">
      <div className={"mb-1 md:mb-4"}>
        {memoizedFavorites.length > 0 && (
          <HorizontalCarousel
            title="FAVORITES"
            objects={memoizedFavorites}
            endpoint={cdnEndpoint}
            onItemClick={(index) => useVideoFavorites.openModal(index)}
          />
        )}
        <VideoCarousel
          objects={memoizedFavorites}
          endpoint={cdnEndpoint}
          useVideo={useVideoFavorites}
        />

        {memoizedTrending.length > 0 && (
          <HorizontalCarousel
            title="TRENDING"
            objects={memoizedTrending}
            endpoint={cdnEndpoint}
            onItemClick={(index) => useVideoTrending.openModal(index)}
          />
        )}
        <VideoCarousel
          objects={memoizedTrending}
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

      <SbAccordion
        folders={memoizedFolders}
        endpoint={cdnEndpoint}
        allowMultiple
      />
      {/* <iframe
        id="laylo-drop-pIGZH"
        frameBorder="0"
        scrolling="no"
        allow="web-share"
        allowTransparency={true}
        style={{ width: "1px", minWidth: "100%", maxWidth: "1000px" }}
        src="https://embed.laylo.com?dropId=pIGZH&color=0c0c0c&minimal=false&theme=dark&background=solid&customTitle=Get%20notified%20when%20new%20content%20drops"
      ></iframe> */}
    </div>
  );
}
