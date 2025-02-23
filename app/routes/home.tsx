import type { Route } from "./+types/home";
import { format } from "date-fns";
import { Accordion, AccordionItem, Button, Tooltip } from "@heroui/react";
import prisma from "~/db.server";
import { Download, Folder, Music, Video } from "lucide-react";
import { Link } from "react-router";
import { formatFileSize, getTotalFolderSize } from "~/utils";

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
            // TODO fix this in am to make this show the file of the folder
            // TODO add the created time as a  color on hovers
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
                        // TODO put thumbnail here
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
                            to={`/download/${object.s3fileKey}`} // Add a proper download route
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
                {/* Popup of thumbnail and image */}
                {/* <div className="mt-8 grid grid-cols-4 gap-4">
                  {folder.objects
                    .filter((obj) => obj.kind === "VIDEO")
                    .map((video) => (
                      <Card key={video.id} className="bg-gray-900 rounded-lg">
                        <CardBody className="p-2">
                          <Image
                            isZoomed
                            src={`https://your-s3-bucket-url.com/${video.s3fileKey}`}
                            alt={video.fileName}
                            className="rounded-lg"
                          />
                          <div className="mt-2 text-center text-sm">
                            {video.fileName}
                          </div>
                        </CardBody>
                      </Card>
                    ))}
                </div> */}
              </div>
            }
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
