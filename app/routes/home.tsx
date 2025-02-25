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
import { type DOMAttributes, type Ref } from "react";
import { Stream } from "@cloudflare/stream-react";
import SbAccordion from "~/components/SbAccordion";

export function meta() {
  return [
    { title: "Hidden Tracks" },
    {
      property: "og:title",
      content: "Hidden Tracks",
    },
    {
      name: "description",
      content: "Where fans find what they need to know.",
    },
  ];
}

export async function loader({ params }: Route.LoaderArgs) {
  // TODO when introducing hidden or draft folders make sure to filter those here!
  const folders = await prisma.folder.findMany({ include: { objects: true } });

  return { folders };
}

export default function ({ loaderData }: Route.ComponentProps) {
  const { folders } = loaderData;

  return (
    <div className="min-h-screen mt-1">
      <div className="w-full px-4 grid grid-cols-[1.5fr_1fr_.5fr_.5fr]">
        <p className="pl-[65px] text-start">NAME</p>
        <p className="text-center">UPLOADED</p>
        <p className="text-center">SIZE</p>
        <p className="text-center">TYPE</p>
      </div>
      <SbAccordion items={folders} allowMultiple />
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
