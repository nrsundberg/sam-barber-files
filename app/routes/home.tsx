import type { Route } from "./+types/home";
import prisma from "~/db.server";
import SbAccordion from "~/components/accordion/SbAccordion";
import { cdnEndpoint } from "~/s3.server";
import VideoCarousel from "~/components/carousel/VideoCarousel";
import { useState, useEffect, useMemo } from "react";
import { useVideoCarousel } from "~/components/carousel/useVideoCarousel";
import HorizontalCarousel from "~/components/carousel/HorizontalCarousel";
import {
  data,
  Link,
  useFetcher,
  type ShouldRevalidateFunction,
} from "react-router";
import { getOptionalUser } from "~/domain/utils/global-context";
import { DisplayStyle, type Object } from "@prisma/client";
import type { FolderWithObjects } from "~/types";
import { z } from "zod";
import { zfd } from "zod-form-data";
import { AudioWavePlayer } from "~/components/Floating AudioPlayer";

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
    prisma.featuredAudio.findFirst({ include: { object: true } }),
  ]);

  // Add cache control headers (30 minutes cache)
  return data(result, {
    headers: {
      "Cache-Control": "public, max-age=1800", // 30 minutes
      Expires: new Date(Date.now() + 1800000).toUTCString(),
    },
  });
}

const updateFavSchema = zfd.formData({
  objectId: z.string(),
  isFavorite: z.string(),
});

export async function action({ request }: Route.ActionArgs) {
  let user = getOptionalUser();
  if (user == null) {
    return null;
  }

  let data = updateFavSchema.parse(await request.formData());

  if (data.isFavorite === "true") {
    await prisma.userFavorite.create({
      data: { userId: user.id, objectId: data.objectId },
    });
    return {
      objectId: data.objectId,
      remove: false,
      object: await prisma.object.findUnique({ where: { id: data.objectId } }),
    };
  } else {
    await prisma.userFavorite.delete({
      where: { userId_objectId: { userId: user.id, objectId: data.objectId } },
    });
    return { objectId: data.objectId, remove: true };
  }
}

export const shouldRevalidate: ShouldRevalidateFunction = ({ formMethod }) => {
  // Check if your action specifically said not to revalidate
  if (formMethod === "POST") {
    return false;
  }

  // Default behavior
  return true;
};

export default function ({ loaderData }: Route.ComponentProps) {
  let [
    folders,
    favorites,
    trending,
    cdnEndpoint,
    optionalUser,
    userFavorites,
    featuredAudio,
  ] = loaderData;
  let [initialLoadComplete, setInitialLoadComplete] = useState(false);

  let fetcher = useFetcher({ key: "personal" });

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

  let [favoritesSet, setFavoriteSet] = useState<Set<string> | null>(null);
  let [personalFolder, setPersonalFolder] = useState<FolderWithObjects | null>(
    null
  );

  useEffect(() => {
    if (fetcher.state == "idle") {
      if (optionalUser === null) {
        setFavoriteSet(null);
        setPersonalFolder(null);
        return;
      }
      let favoritesSetTemp = favoritesSet
        ? new Set([...favoritesSet])
        : new Set<string>();
      let objects: Object[] =
        personalFolder?.objects ?? userFavorites?.map((it) => it.object) ?? [];

      if (fetcher.data?.remove === false) {
        if (fetcher.data.object) {
          objects.push(fetcher.data.object);
          favoritesSetTemp.add(fetcher.data.object.id);
        }
      } else {
        favoritesSetTemp.delete(fetcher.data?.objectId);
        objects = objects.filter(
          (it: Object) => it.id !== fetcher.data?.objectId
        );
      }

      (personalFolder?.objects ?? userFavorites)?.forEach((it: any) => {
        if (it.object && it.object?.id !== fetcher.data?.objectId) {
          objects.push(it.object);
          favoritesSetTemp.add(it.object.id);
        }
      });

      let favoriteFolder: FolderWithObjects = {
        id: "myFavorites",
        name: "My Favorites",
        folderPosition: 1,
        hidden: false,
        createdDate: userFavorites?.at(0)?.addedAt ?? new Date(),
        objects,
        parentFolderId: null,
        defaultStyle: DisplayStyle.GRID,
      };

      setPersonalFolder({ ...favoriteFolder });
      setFavoriteSet(favoritesSetTemp);
    }
  }, [folders.length, fetcher.state]);

  return (
    <div className="min-h-fit mt-1 flex flex-col bg-black">
      {featuredAudio && (
        <AudioWavePlayer
          audioSrc={encodeURI(cdnEndpoint + featuredAudio.object.s3fileKey)}
          // TODO delete me
          // audioSrc={encodeURI(
          // "http://localhost:9001/sam-barber-files/001/04 Man of the Year Mix 1.mp3"
          // )}
        />
      )}
      <div className="flex-1">
        <div className={"mb-1 md:mb-4"}>
          {favorites.length > 0 && (
            <HorizontalCarousel
              title="FAVORITES"
              objects={favorites}
              endpoint={cdnEndpoint}
              onItemClick={(index) => useVideoFavorites.openModal(index)}
              personalFavoriteIds={favoritesSet}
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
              personalFavoriteIds={favoritesSet}
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
          personalFolder={personalFolder}
          folders={folders}
          endpoint={cdnEndpoint}
          allowMultiple
          initialLoadComplete={initialLoadComplete}
          personalFavoriteSet={favoritesSet}
        />
      </div>
      <footer className="mt-auto items-center text-center bg-black">
        {optionalUser ? (
          optionalUser.signedUpForLaylo ? (
            <Link to={"/user"}>View Profile</Link>
          ) : (
            <div className="flex-col w-full gap-2">
              <Link to={"/user"} className="underline text-blue-500">
                View Profile
              </Link>
              <Link to={"signup/laylo"} className="underline text-blue-500">
                Get notified when new content drops
              </Link>
            </div>
          )
        ) : (
          <a href="/login" className="text-blue-500 underline">
            Sign up to get notified when new content drops and save your
            favorite content
          </a>
        )}
      </footer>
    </div>
  );
}
