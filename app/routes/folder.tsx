import { format } from "date-fns";
import {
  Accordion,
  AccordionItem,
  Button,
  Card,
  CardBody,
  Image,
  Tooltip,
} from "@heroui/react";
import type { Route } from "./+types/folder";
import prisma from "~/db.server";
import { Download, Folder, Music, Video } from "lucide-react";
import { Link } from "react-router";

export async function loader({ params }: Route.LoaderArgs) {
  const folderId = params.folderId || null;

  //   if (!folderId) {
  //     throw new Response("Folder not found", { status: 404 });
  //   }

  const folders = await prisma.folder.findMany({ include: { objects: true } });

  //   const folder = await prisma.folder.findUnique({
  //     where: { id: folderId },
  //     include: { objects: true },
  //   });

  //   if (!folder) {
  //     throw new Response("Folder not found", { status: 404 });
  //   }

  return { folders };
}

export default function ({ loaderData }: Route.ComponentProps) {
  const { folders } = loaderData;

  return (
    <div className="p-6 bg-black min-h-screen text-white">
      <Accordion>
        {folders.map((folder) => (
          <AccordionItem key={folder.id} title={folder.name}>
            {
              <div className="mt-6 border border-gray-700 rounded-lg overflow-hidden">
                {folder.objects.map((object) => (
                  <div
                    key={object.id}
                    className="flex items-center justify-between px-4 py-3 border-b border-gray-700 hover:bg-gray-800"
                  >
                    <div className="flex items-center gap-4">
                      {object.kind === "FOLDER" ? (
                        <Folder className="text-yellow-400 w-6 h-6" />
                      ) : object.kind === "AUDIO" ? (
                        <Music className="text-blue-400 w-6 h-6" />
                      ) : (
                        <Video className="text-green-400 w-6 h-6" />
                      )}

                      {object.kind === "FOLDER" ? (
                        <Link
                          to={`/folder/${object.id}`}
                          className="text-yellow-400"
                        >
                          {object.fileName}
                        </Link>
                      ) : (
                        <span>{object.fileName}</span>
                      )}
                    </div>

                    <div className="flex gap-6 text-sm">
                      <span className="text-gray-400">
                        {format(
                          new Date(object.createdDate),
                          "MM.dd.yyyy hh:mm a"
                        )}
                      </span>
                      <span className="text-gray-300">
                        {(Number(object.size) / 1024 / 1024).toFixed(1)}MB
                      </span>
                      {object.kind !== "FOLDER" && (
                        <Tooltip content="Download">
                          <Button
                            isIconOnly
                            as="a"
                            href={`/download/${object.s3fileKey}`} // Add a proper download route
                            className="bg-gray-700 hover:bg-gray-600"
                          >
                            <Download className="w-5 h-5 text-white" />
                          </Button>
                        </Tooltip>
                      )}
                    </div>
                  </div>
                ))}
                <div className="mt-8 grid grid-cols-4 gap-4">
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
                </div>
              </div>
            }
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
