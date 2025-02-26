import prisma from "~/db.server";
import type { Route } from "./+types/reorder";

export async function action({ request, params }: Route.ActionArgs) {
  try {
    if (params.type === "folder") {
      let { reorderedFolders } = await request.json();

      for (const folder of reorderedFolders) {
        await prisma.folder.update({
          where: { id: folder.id },
          data: { folderPosition: folder.position },
        });
      }

      return { success: true };
    }
  } catch (e) {
    console.error("Error reordering folders with error: ", e);
    return { success: false };
  }

  if (params.type === "object") {
    try {
      let { reorderedObjects } = await request.json();

      for (const object of reorderedObjects) {
        await prisma.object.update({
          where: { id: object.id },
          data: { filePosition: object.position },
        });
      }

      return { success: true };
    } catch (e) {
      console.error("Error reordering objects with error: ", e);
      return { success: false };
    }
  }
  return { status: "unknown action", success: false };
}
