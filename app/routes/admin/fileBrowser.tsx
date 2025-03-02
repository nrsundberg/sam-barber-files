import type { Route } from "./+types/fileBrowser";
import { listS3Objects } from "~/s3.server";
import { getUserAndProtectRoute } from "~/utils.server";
import prisma from "~/db.server";
import S3AssetManager from "~/components/S3AssetManagement";
import { dataWithError } from "remix-toast";

export function meta() {
  return [{ title: "File Browser - Admin Panel" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  let user = await getUserAndProtectRoute(request);

  // Get all S3 files
  let s3Files = await listS3Objects();

  // Get all database objects
  let dbObjects = await prisma.object.findMany();

  // Get all folders for the folder selection dropdown
  let folders = await prisma.folder.findMany({
    select: { id: true, name: true },
  });

  return {
    s3Files,
    dbObjects,
    folders,
  };

  // return listS3Objects();
}

export async function action({ request }: Route.ActionArgs) {
  // Verify authentication
  let user = await getUserAndProtectRoute(request);

  let formData = await request.formData();
  let action = formData.get("action") as string;

  // Handle creation of a new database object
  if (action === "createObject") {
    const s3fileKey = formData.get("s3fileKey") as string;
    const fileName = formData.get("fileName") as string;
    const size = parseInt(formData.get("size") as string);
    const folderId = formData.get("folderId") as string;
    const kind = formData.get("kind") as "PHOTO" | "VIDEO" | "AUDIO";

    try {
      // Get the highest filePosition in this folder to place the new file at the end
      let highestPositionObj = await prisma.object.findFirst({
        where: { folderId },
        orderBy: { filePosition: "desc" },
      });

      let filePosition = highestPositionObj
        ? highestPositionObj.filePosition + 1
        : 0;

      // Create the new object
      let newObject = await prisma.object.create({
        data: {
          fileName,
          createdDate: new Date(),
          hidden: false,
          size,
          kind,
          filePosition,
          s3fileKey,
          folderId,
        },
      });

      return {
        success: true,
        message: `Object "${fileName}" created successfully.`,
        object: newObject,
      };
    } catch (error) {
      console.error("Error creating object:", error);
      return { error: true, message: "Failed to create object." };
    }
  }

  // Handle setting a file as a poster image
  if (action === "setPoster") {
    let posterId = formData.get("posterId") as string;
    let s3Key = formData.get("s3Key") as string;

    try {
      // TODO this should be an sql on change field so if the poster key changes this is reflected
      let poster = await prisma.object.findUniqueOrThrow({
        where: { id: posterId },
      });
      let updatedObject = await prisma.object.update({
        where: { s3fileKey: s3Key },
        data: { posterKey: poster.s3fileKey },
      });

      return {
        success: true,
        message: "Poster image set successfully.",
        object: updatedObject,
      };
    } catch (error) {
      console.error("Error setting poster image:", error);
      return { error: true, message: "Failed to set poster image." };
    }
  }

  return dataWithError(
    { error: true, message: "Invalid action." },
    "Invalid action"
  );
}

export default function ({ loaderData }: Route.ComponentProps) {
  let { s3Files, dbObjects, folders } = loaderData;

  return (
    <S3AssetManager files={s3Files} dbObjects={dbObjects} folders={folders} />
  );
}
