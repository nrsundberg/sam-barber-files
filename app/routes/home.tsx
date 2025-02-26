import type { Route } from "./+types/home";
import {
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@heroui/react";
import prisma from "~/db.server";
import type { Object } from "@prisma/client";
import { type DOMAttributes, type Ref } from "react";
import { Stream } from "@cloudflare/stream-react";
import SbAccordion from "~/components/SbAccordion";
import { Music, Video } from "lucide-react";
import { formatInTimeZone } from "date-fns-tz";

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
  return Promise.all([folders, favorites, trending]);
}

export default function ({ loaderData }: Route.ComponentProps) {
  let [folders, favorites, trending] = loaderData;

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
                <ThumbnailObject key={object.id} object={object} />
              ))}
            </div>
          </div>
        )}
        {trending.length > 0 && (
          <div>
            <p>TRENDING</p>
            <div className={"inline-flex gap-1 md:gap-3"}>
              {trending.map((object: Object) => (
                <ThumbnailObject key={object.id} object={object} />
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

function ThumbnailObject({ object }: { object: Object }) {
  return (
    <div className={"flex flex-col"}>
      <p>
        {object.kind === "AUDIO" ? (
          <Music className="text-blue-400 w-6 h-6" />
        ) : (
          <Video className="text-green-400 w-6 h-6" />
        )}
      </p>
      <p>{object.fileName}</p>
      <p>{formatInTimeZone(object.createdDate, "UTC", "MM.dd.yyyy hh:mm a")}</p>
    </div>
  );
}

function VideoModal({
  objects,
  isOpen,
  targetRef,
  onOpenChange,
  moveProps,
}: {
  objects: Object[];
  isOpen: boolean;
  targetRef: Ref<HTMLElement>;
  onOpenChange: (isOpen: boolean) => void;
  moveProps: DOMAttributes<any>;
}) {
  return (
    <Modal
      ref={targetRef}
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      size="2xl"
    >
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader {...moveProps} className="flex flex-col gap-1">
              Modal Title
            </ModalHeader>
            <ModalBody>
              <Stream controls src={"46a7ee1393114999a0336fe42ee0d21c"} />
            </ModalBody>
            <ModalFooter>
              <Button color="danger" variant="light" onPress={onClose}>
                Close
              </Button>
              <Button color="primary" onPress={onClose}>
                Action
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}

// {
//   uid: '46a7ee1393114999a0336fe42ee0d21c',
//   creator: null,
//   thumbnail: 'https://customer-yqckd695h17mnoy3.cloudflarestream.com/46a7ee1393114999a0336fe42ee0d21c/thumbnails/thumbnail.jpg',
//   thumbnailTimestampPct: 0,
//   readyToStream: false,
//   readyToStreamAt: null,
//   status: { state: 'downloading', errorReasonCode: '', errorReasonText: '' },
//   meta: {
//   },
//   created: '2025-02-24T02:33:54.456625Z',
//   modified: '2025-02-24T02:33:54.456625Z',
//   scheduledDeletion: null,
//   size: 9272364,
//   preview: 'https://customer-yqckd695h17mnoy3.cloudflarestream.com/46a7ee1393114999a0336fe42ee0d21c/watch',
//   allowedOrigins: [],
//   requireSignedURLs: false,
//   uploaded: '2025-02-24T02:33:54.456602Z',
//   uploadExpiry: null,
//   maxSizeBytes: null,
//   maxDurationSeconds: null,
//   duration: -1,
//   input: { width: -1, height: -1 },
//   playback: {
//     hls: 'https://customer-yqckd695h17mnoy3.cloudflarestream.com/46a7ee1393114999a0336fe42ee0d21c/manifest/video.m3u8',
//     dash: 'https://customer-yqckd695h17mnoy3.cloudflarestream.com/46a7ee1393114999a0336fe42ee0d21c/manifest/video.mpd'
//   },
//   watermark: null,
//   clippedFrom: null,
//   publicDetails: null
// }
