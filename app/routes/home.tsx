import type { Route } from "./+types/home";
import prisma from "~/db.server";
import SbAccordion from "~/components/accordion/SbAccordion";
import { cdnEndpoint } from "~/s3.server";
import VideoCarousel from "~/components/carousel/VideoCarousel";
import { useState, useEffect, useMemo } from "react";
import { useVideoCarousel } from "~/components/carousel/useVideoCarousel";
import HorizontalCarousel from "~/components/carousel/HorizontalCarousel";
import { data, Link } from "react-router";
import { getOptionalUser } from "~/domain/utils/global-context";
import { DisplayStyle, type Folder, type UserFavorite } from "@prisma/client";
import type { FolderWithObjects } from "~/types";

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
export async function loader({ request }: Route.LoaderArgs) {
  let user = getOptionalUser();

  let userFavorites =
    user &&
    prisma.userFavorite.findMany({
      where: { userId: user.id },
      include: { object: true },
    });

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

  const result = await Promise.all([
    folders,
    favorites,
    trending,
    cdnEndpoint,
    user,
    userFavorites,
  ]);

  // Add cache control headers (30 minutes cache)
  return data(result, {
    headers: {
      "Cache-Control": "public, max-age=1800", // 30 minutes
      Expires: new Date(Date.now() + 1800000).toUTCString(),
    },
  });
}

export default function ({ loaderData }: Route.ComponentProps) {
  let [folders, favorites, trending, cdnEndpoint, optionalUser, userFavorites] =
    loaderData;
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

  let adjFolders = useMemo(() => {
    let favoriteFolder: FolderWithObjects = {
      id: "myFavorites",
      name: "My Favorites",
      folderPosition: 1,
      hidden: false,
      createdDate: userFavorites?.at(0)?.addedAt ?? new Date(),
      objects: userFavorites?.map((it) => it.object) ?? [],
      parentFolderId: null,
      defaultStyle: DisplayStyle.GRID,
    };
    return [favoriteFolder, ...folders];
  }, [folders.length]);

  return (
    <div className="min-h-fit mt-1 flex flex-col">
      <div className="flex-1">
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
          folders={adjFolders}
          endpoint={cdnEndpoint}
          allowMultiple
          initialLoadComplete={initialLoadComplete}
        />
      </div>
      <footer className="mt-auto items-center">
        {optionalUser ? (
          optionalUser.signedUpForLaylo ? (
            <Link to={"/user"}>View Profile</Link>
          ) : (
            <div className="inline-flex w-full justify-between px-10">
              <Link to={"/user"} className="underline text-blue-500">
                View Profile
              </Link>
              <Link to={"signup/laylo"} className="underline text-blue-500">
                Get notified when new content drops
              </Link>
            </div>
          )
        ) : (
          <p>
            Sign up to get notified when new content drops and save your
            favorite content
          </p>
        )}
      </footer>
    </div>
  );
}
