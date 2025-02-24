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
  Navbar,
  NavbarBrand,
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
              <video src="http://localhost:9001/api/v1/download-shared-object/aHR0cDovLzEyNy4wLjAuMTo5MDAwL211c2ljLXNpdGUvNF9TdHVudCUyMExhbmd1YWdlJTIwMTVzZWMlMjAxMDA3MTMlMjA0Lm1wND9YLUFtei1BbGdvcml0aG09QVdTNC1ITUFDLVNIQTI1NiZYLUFtei1DcmVkZW50aWFsPUZDNDBTWUxNWDNWRDZVUFhVWlNEJTJGMjAyNTAyMjQlMkZ1cy1lYXN0LTElMkZzMyUyRmF3czRfcmVxdWVzdCZYLUFtei1EYXRlPTIwMjUwMjI0VDAxMjIyMVomWC1BbXotRXhwaXJlcz00MzIwMCZYLUFtei1TZWN1cml0eS1Ub2tlbj1leUpoYkdjaU9pSklVelV4TWlJc0luUjVjQ0k2SWtwWFZDSjkuZXlKaFkyTmxjM05MWlhraU9pSkdRelF3VTFsTVRWZ3pWa1EyVlZCWVZWcFRSQ0lzSW1WNGNDSTZNVGMwTURNNU16SXhOaXdpY0dGeVpXNTBJam9pWkdWMlZYTmxjaUo5Lk9jbXpWWWcza1ZLejBLc2xUY1NocjJUMnpuLWVDd2dvZEhjTXVQTkx1cjRqNkh4ZWYtWlgwTVhfUGFwanVjYmYtdGlqZVI3TDNGTXB6QXVISG1VcGRRJlgtQW16LVNpZ25lZEhlYWRlcnM9aG9zdCZ2ZXJzaW9uSWQ9bnVsbCZYLUFtei1TaWduYXR1cmU9OGFiOWM5ZWU4OWUwZDA2NWNjYTdkZTA1MmU3MmVhOGM1OWU3OWRmODA2Yzg0ZWZmMTAyZWQ2MWU5YTk5NTIwNg" />
              {/* // <MuxPlayer
              //   playbackId="a4nOgmxGWg6gULfcBbAa00gXyfcwPnAFldF8RdsNyk8M"
              //   theme="minimal"
              //   metadata={{
              //     video_id: "video-id-54321",
              //     video_title: "Test video title",
              //     viewer_user_id: "user-id-007",
              //   }}
              // /> */}
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
