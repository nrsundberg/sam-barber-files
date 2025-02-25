import prisma from "~/db.server";
import type { Route } from "./+types/data.reorder";

export async function action({ request }: Route.ActionArgs) {
  let { reorderedFolders } = await request.json();

  for (const folder of reorderedFolders) {
    await prisma.folder.update({
      where: { id: folder.id },
      data: { folderPosition: folder.position },
    });
  }

  return { success: true };
}
