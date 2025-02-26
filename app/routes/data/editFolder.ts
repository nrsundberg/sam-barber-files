import prisma from "~/db.server";
import type { Route } from "./+types/editFolder";
import invariant from "tiny-invariant";
import { convertToUTCDateTime } from "~/utils";

export async function action({ request, params }: Route.ActionArgs) {
  let formData = await request.formData();
  let { actionType, folderId } = params;

  switch (actionType) {
    case "rename":
      let name = formData.get("name")?.toString();
      invariant(name, "Must include folder name");

      await prisma.folder.update({
        where: { id: folderId },
        data: { name },
      });
      break;

    case "changeDate":
      let stringDate = formData.get("createdDate")?.toString();
      invariant(stringDate, "Must include date");

      await prisma.folder.update({
        where: { id: folderId },
        data: { createdDate: convertToUTCDateTime(stringDate).toISOString() },
      });
      break;

    case "toggleHidden":
      const hidden = formData.get("hidden")?.toString() === "true";

      await prisma.folder.update({
        where: { id: folderId },
        data: { hidden },
      });
      break;

    case "delete":
      // TODO will this cascade and delete related objects
      await prisma.folder.delete({
        where: { id: folderId },
      });
      break;
  }

  return null;
}
