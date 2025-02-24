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
              <video width="400" controls>
                <source
                  src="https://music-site-dev.s3.us-east-2.amazonaws.com/4_Stunt+Language+15sec+100713+4+(2).mp4"
                  type="video/mp4"
                />
              </video>
              {/* <video src="s3://music-site-dev/4_Stunt Language 15sec 100713 4 (2).mp4" /> */}
              {/* <video src="https://music-site-dev.s3.us-east-2.amazonaws.com/4_Stunt%20Language%2015sec%20100713%204%20%282%29.mp4?response-content-disposition=inline&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Security-Token=IQoJb3JpZ2luX2VjEOr%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEaCXVzLWVhc3QtMiJIMEYCIQDP8MdG%2BZMB1bje3uNtA6S0%2BgOiwZ79JUgBzQ9BU9MmEQIhAKkiFhl%2FhEtrXEOlIVVr%2Fopr4lhZtm994wpo7BuozWoaKvkCCCMQABoMMzk2NjA4ODExOTc0IgxxIrEY8NLMQUiEhUAq1gLbvO8HxfUHI8iNYebkxIlaaCvPJ5DYXIOdGGSPoj3warSSiI5tFtAcEx%2BhZBZHF0j3rXuCs3RawBrqlv26X0bLSW1JkT%2Fq4TvBdHgd%2BWjVXCPHPNJnm6HkIr55foEnOwP4lgygZj2T4Y37cgOZJEJYyRZkiIE56EKVdP1sPHTr5F936po8G6pr2gYej6iZOG7kN14i8yEuTseIfkHmbebpmbpJimSM6dq%2Fl%2BzavLkE1pxu%2BpZrKbGZsrW3Orqs%2BCf77Irb1ZzO2XrrsMPsr2yiCa%2Bjvr3en940DHs6fsHzp459lmmqp6lORKB3vlxdYLzeEW49l9vPTEBVBvUrIjV3mgOLAFkfxBW7B6%2F4qqZ9I81Lcqe2V6%2FobkHIE7E3PealmY8uejsfrzQvsQfh%2BjzOnub8OxF6MK4hpgrvmVgHL%2BnqH4JIO4rZzyFhoDjTmrw%2B8UbqGMAw1dzuvQY6jgJiUOQbHVZKv%2B9XNyo2HdbmmzB%2BJCjj9T2gEzN4GMWEf5lWfHJrIy89UuIh2TWx5o0CW8qyy6KH2ph45s%2BVKas%2BeRXpVCDTMolRQaaXkaXgzGeU4gwOJ%2BcePS%2Bk7gTL%2F28mP5X78mHUoRNIs25id%2BtPuSZ0jYq%2Fi8rxI0CD%2FRL7Bu3GD5YyRh1WfZNM9W7u%2BW%2B0RAPJJQpCTtjuRNOgXeO%2BxmzaDAFB6zKTXHCzftkRYTjFUL0R1721KbZIozTjb2NJgaU85iRxDux0Jxr2q7BMAMAhyzZxS2aEvpW8RZlIUFWgdImC5qxKuXM6fZOcTn7rR1l7sW3RJ6hfAe9f5EqAOZAu%2BTte1yGuKS76Rmk%3D&X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=ASIAVYV52GPDDXKRWIRS%2F20250224%2Fus-east-2%2Fs3%2Faws4_request&X-Amz-Date=20250224T013832Z&X-Amz-Expires=3600&X-Amz-SignedHeaders=host&X-Amz-Signature=b4221e165b772c36a47893688678117b5b2f378d9fc4ae9652f8a5190b8267f4" /> */}
              {/* <video src="http://localhost:9001/api/v1/download-shared-object/aHR0cDovLzEyNy4wLjAuMTo5MDAwL211c2ljLXNpdGUvNF9TdHVudCUyMExhbmd1YWdlJTIwMTVzZWMlMjAxMDA3MTMlMjA0Lm1wND9YLUFtei1BbGdvcml0aG09QVdTNC1ITUFDLVNIQTI1NiZYLUFtei1DcmVkZW50aWFsPUZDNDBTWUxNWDNWRDZVUFhVWlNEJTJGMjAyNTAyMjQlMkZ1cy1lYXN0LTElMkZzMyUyRmF3czRfcmVxdWVzdCZYLUFtei1EYXRlPTIwMjUwMjI0VDAxMjIyMVomWC1BbXotRXhwaXJlcz00MzIwMCZYLUFtei1TZWN1cml0eS1Ub2tlbj1leUpoYkdjaU9pSklVelV4TWlJc0luUjVjQ0k2SWtwWFZDSjkuZXlKaFkyTmxjM05MWlhraU9pSkdRelF3VTFsTVRWZ3pWa1EyVlZCWVZWcFRSQ0lzSW1WNGNDSTZNVGMwTURNNU16SXhOaXdpY0dGeVpXNTBJam9pWkdWMlZYTmxjaUo5Lk9jbXpWWWcza1ZLejBLc2xUY1NocjJUMnpuLWVDd2dvZEhjTXVQTkx1cjRqNkh4ZWYtWlgwTVhfUGFwanVjYmYtdGlqZVI3TDNGTXB6QXVISG1VcGRRJlgtQW16LVNpZ25lZEhlYWRlcnM9aG9zdCZ2ZXJzaW9uSWQ9bnVsbCZYLUFtei1TaWduYXR1cmU9OGFiOWM5ZWU4OWUwZDA2NWNjYTdkZTA1MmU3MmVhOGM1OWU3OWRmODA2Yzg0ZWZmMTAyZWQ2MWU5YTk5NTIwNg" /> */}
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
