import type { Route } from "./+types/home";
import { format } from "date-fns";
import {
  Accordion,
  AccordionItem,
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Tooltip,
  useDisclosure,
  useDraggable,
} from "@heroui/react";
import prisma from "~/db.server";
import { Download, Folder, Music, Video } from "lucide-react";
import { Link } from "react-router";
import { formatFileSize, getTotalFolderSize } from "~/utils";
import { useRef, type DOMAttributes, type Ref } from "react";
import MuxPlayer from "@mux/mux-player-react";
import "@mux/mux-player/themes/minimal";
import { Stream } from "@cloudflare/stream-react";

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

  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const targetRef = useRef<HTMLElement>(null);
  const { moveProps } = useDraggable({ targetRef, isDisabled: !isOpen });

  return (
    <div className="min-h-screen mt-1">
      <div className="w-full flex justify-end">
        <div className="w-[370px] grid grid-cols-[150px_150px_90px] text-gray-400 text-sm text-center mr-[32px]">
          <p className="text-center">UPLOADED</p>
          <p className="text-center">SIZE</p>
        </div>
      </div>
      <Accordion
        showDivider={false}
        isCompact
        motionProps={{
          variants: {
            enter: {
              y: 0,
              opacity: 1,
              height: "auto",
              overflowY: "unset",
              transition: {
                height: {
                  type: "spring",
                  stiffness: 500,
                  damping: 30,
                  duration: 1,
                },
                opacity: {
                  easings: "ease",
                  duration: 1,
                },
              },
            },
            exit: {
              y: -10,
              opacity: 0,
              height: 0,
              overflowY: "hidden",
              transition: {
                height: {
                  easings: "ease",
                  duration: 0.25,
                },
                opacity: {
                  easings: "ease",
                  duration: 0.3,
                },
              },
            },
          },
        }}
      >
        {folders.map((folder) => (
          <AccordionItem
            key={folder.id}
            className=" hover:bg-gray-800 transition duration-300 text-gray-400
                      hover:text-[#D17885] hover:shadow-[0_0_4px_#D17885]"
            textValue={folder.name}
            title={
              <div className="w-full flex justify-between">
                <p>{folder.name}</p>
                <div className="w-[370px] grid grid-cols-[150px_150px_90px] text-gray-400 text-sm text-center">
                  <p className="self-center">
                    {format(new Date(folder.createdDate), "MM.dd.yyyy hh:mm a")}
                  </p>
                  <p className="self-center">
                    {formatFileSize(getTotalFolderSize(folder.objects))}
                  </p>
                </div>
              </div>
            }
            startContent={
              <div className="grid grid-cols-2 gap-1 w-[50px]">
                <p className="text-sm text-gray-400 text-right">
                  {folder.folderNumber}
                </p>
                <Folder />
              </div>
            }
          >
            {
              <div className="mt-2 border-t border-b border-gray-700 overflow-hidden">
                {folder.objects.map((object) => (
                  <div
                    onClick={onOpen}
                    key={object.id}
                    className="pl-10 flex items-center justify-between py-2
                     hover:bg-gray-800 transition duration-300 text-gray-400
                      hover:text-[#D17885] hover:shadow-[0_0_4px_#D17885] group"
                  >
                    <div className="flex items-center gap-4">
                      {object.kind === "AUDIO" ? (
                        <Music className="text-blue-400 w-6 h-6" />
                      ) : (
                        <Video className="text-green-400 w-6 h-6" />
                      )}
                      <span className="text-white group-hover:text-[#D17885]">
                        {object.fileName}
                      </span>
                    </div>
                    <div className="w-[400px] grid grid-cols-[150px_150px_100px] text-sm text-center">
                      <p className="self-center">
                        {format(
                          new Date(object.createdDate),
                          "MM.dd.yyyy hh:mm a"
                        )}
                      </p>
                      <p className="self-center">
                        {formatFileSize(object.size)}
                      </p>
                      <div className="flex justify-end pr-1">
                        <Tooltip content="Download">
                          <Button
                            isIconOnly
                            variant="shadow"
                            as={Link}
                            to={`/download/${object.s3fileKey}`}
                            reloadDocument
                            className="bg-sb-banner hover:bg-green-200 text-white hover:text-black"
                          >
                            <Download className="w-5 h-5" />
                          </Button>
                        </Tooltip>
                      </div>
                    </div>
                  </div>
                ))}
                <VideoModal
                  objects={folder.objects}
                  isOpen={isOpen}
                  targetRef={targetRef}
                  onOpenChange={onOpenChange}
                  moveProps={moveProps}
                />
              </div>
            }
          </AccordionItem>
        ))}
      </Accordion>
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
//     'downloaded-from': 'https://music-site-dev.s3.us-east-2.amazonaws.com/4_Stunt%20Language%2015sec%20100713%204%20%282%29.mp4?response-content-disposition=inline&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Security-Token=IQoJb3JpZ2luX2VjEOr%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEaCXVzLWVhc3QtMiJGMEQCIGOJp6OkCK9K3GZJuDh9TwjIheTOqpwnz11L3JDnOwFwAiA48YjxvqD4YtgvX8mBacKI2kv3lj6S6PiL7h0J543tiyr5AggjEAAaDDM5NjYwODgxMTk3NCIMPtyLxCQxsl5z42JIKtYCODhyU4VegUlNYRt7DLeyKli9qstUdQEHoNKwk8ZgKisu%2B27jUIfR592NAXyzswLLAWgVzhQhvYkuSDPGANP7yDvpPpJy182LvGYbt2YJPe6Mlhr01svHUA7CQZc%2FLqv%2BO39i0XGRzF1yt5eGnVVfYoTIP6fcP1sLqJq2mXBr%2BCPjJ5dPCU00eCQB7Pbgapesyqk65m7w%2FCmdm%2B39wV4hkv2OrK88yPxAQXUTzUUKEFWCMeKbFLhZGMVqjwdap5tbkp%2FmVHkPZoDtwVlmkXXwFI%2FquuTt%2B6b12C%2B3iDDsd%2BccVCdNoIolhvPLpO1aQYkjjXyJMjIcf8Xe1mOgL1YWgEJp9LRfYTFrvAegm%2FQN%2FCL3ScvcKxsNfocyBe1ErF7t5Kn0uQvqcXTEeeYtf9iNrGlqlhqXXOMqpDvo%2Bbdu294YD%2BGvZFaDT58F%2Bq3HKbSaUPlgXeVbMNXc7r0GOpACI%2BjAxPOMn6UqCDYtFlNT2Fq8rmlX1KkEqve6H%2BpHdJYriWC1VsyHTYPeMJ2nJNgIO2xywuEnTCNXS34TROgXiTVvXCXa%2F3ImghYNEuguXZqGeNr%2BWS1GjfCc%2FeoI5V4v5%2F5uSk9EWtbhEHMtr7gW6qzgKPZLG3DIvMZWiGGXt2wcK0MhANN4JVQ%2Fj9efpIdQ7epv%2BLjqOMhHgaZUsB1IlZsMceUgv06ZGkXSFt7IRe4hoTu0sq1eTNpxabMV0VjSzuAELAoF3vgKrhmwB6SiFxwV0ot%2FGw%2Bi9TOZLVObKYRpQmF%2Fkx4NMcoHX5PckT5PKETuEZVKG98weBFal1nbRFCGb%2B2NMTjzk8uaxxX6wYQ%3D&X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=ASIAVYV52GPDEPRZ5ZK3%2F20250224%2Fus-east-2%2Fs3%2Faws4_request&X-Amz-Date=20250224T020634Z&X-Amz-Expires=3600&X-Amz-SignedHeaders=host&X-Amz-Signature=5832614758dd6b1ba2bb677f67407f1002ef1453d5c417862fe7e5f33b04cbb9'
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
