import type { Route } from "./+types/fileBrowser";
import { listS3Objects } from "~/s3.server";
import { getUserAndProtectRouteToAdminOrDeveloper } from "~/utils.server";
import prisma from "~/db.server";
import { dataWithError } from "remix-toast";
import OrphanedDbObjects from "~/components/s3/OrphanedObjects";
import { getUser } from "~/domain/utils/global-context";

export function meta() {
  return [{ title: "Orphaned Objects - Admin Panel" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  let user = getUser();
  await getUserAndProtectRouteToAdminOrDeveloper(user);

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
}

export async function action({ request }: Route.ActionArgs) {
  // Verify authentication
  let user = getUser();
  await getUserAndProtectRouteToAdminOrDeveloper(user);

  let formData = await request.formData();
  let action = formData.get("action") as string;

  // Handle fixing an orphaned object
  if (action === "fixOrphanedObject") {
    const objectId = formData.get("objectId") as string;
    const fileName = formData.get("fileName") as string;
    const newS3fileKey = formData.get("newS3fileKey") as string;
    const newPosterKey = formData.get("newPosterKey") as string;

    try {
      // Prepare update data
      const updateData: any = { fileName };

      // Update S3 file key if provided
      if (newS3fileKey) {
        updateData.s3fileKey = newS3fileKey;

        // Get the file size from S3 for accuracy
        const s3Files = await listS3Objects();
        const s3File = s3Files.find((file) => file.key === newS3fileKey);
        if (s3File) {
          updateData.size = s3File.size;
        }
      }

      // Update poster key if provided
      if (newPosterKey) {
        if (newPosterKey === "remove") {
          updateData.posterKey = null;
        } else {
          updateData.posterKey = newPosterKey;
        }
      }

      // Update the object
      const updatedObject = await prisma.object.update({
        where: { id: objectId },
        data: updateData,
      });

      return {
        success: true,
        message: `Object "${fileName}" updated successfully.`,
        object: updatedObject,
      };
    } catch (error) {
      console.error("Error updating object:", error);
      return { error: true, message: "Failed to update object." };
    }
  }

  // Handle deleting an orphaned object
  if (action === "deleteObject") {
    const objectId = formData.get("objectId") as string;

    try {
      // Get object info for the success message
      const objectToDelete = await prisma.object.findUnique({
        where: { id: objectId },
      });

      // Delete the object
      await prisma.object.delete({
        where: { id: objectId },
      });

      return {
        success: true,
        message: `Object "${objectToDelete?.fileName || objectId}" deleted successfully.`,
      };
    } catch (error) {
      console.error("Error deleting object:", error);
      return { error: true, message: "Failed to delete object." };
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
    <OrphanedDbObjects
      s3Files={s3Files}
      dbObjects={dbObjects}
      folders={folders}
    />
  );
}
