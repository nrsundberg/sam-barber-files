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
    <div className="py-6 bg-black min-h-screen text-white">
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
            textValue={folder.name}
            title={
              <div className="w-full flex justify-between">
                <p>{folder.name}</p>
                <div className="w-[300px] flex justify-between text-gray-400 text-sm mr-[60px]">
                  <p>
                    {format(new Date(folder.createdDate), "MM.dd.yyyy hh:mm a")}
                  </p>
                  <p className="text-gray-300">
                    {formatFileSize(getTotalFolderSize(folder.objects))}
                  </p>
                </div>
              </div>
            }
            startContent={
              <div className="grid grid-cols-2 gap-1 w-[50px]">
                <p className="text-sm text-gray-400 text-right ">
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
                    <div className="w-[360px] flex items-center justify-between text-sm">
                      <p>
                        {format(
                          new Date(object.createdDate),
                          "MM.dd.yyyy hh:mm a"
                        )}
                      </p>
                      <p>{formatFileSize(object.size)}</p>

                      <div className="w-[60px] flex justify-end pr-1">
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
                <Button onPress={onOpen}>Open viewer</Button>
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
              <MuxPlayer
                playbackId="a4nOgmxGWg6gULfcBbAa00gXyfcwPnAFldF8RdsNyk8M"
                theme="minimal"
                metadata={{
                  video_id: "video-id-54321",
                  video_title: "Test video title",
                  viewer_user_id: "user-id-007",
                }}
              />
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
