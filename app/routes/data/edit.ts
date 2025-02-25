import prisma from "~/db.server";
import type { Route } from "./+types/edit";
import { zfd } from "zod-form-data";
import { z } from "zod";
import invariant from "tiny-invariant";
import { convertToUTCDateTime } from "~/utils";

const editSchema = zfd.formData({
  actionType: z.string(),
  objectId: z.string(),
});

export async function action({ request }: Route.ActionArgs) {
  let formData = await request.formData();
  let { actionType, objectId } = editSchema.parse(formData);

  switch (actionType) {
    case "rename":
      let fileName = formData.get("fileName")?.toString();
      invariant(fileName, "Must include file name");

      await prisma.object.update({
        where: { id: objectId },
        data: { fileName },
      });
      break;

    case "move":
      let folderId = formData.get("folderId")?.toString();
      invariant(folderId, "Must include folderId");

      await prisma.object.update({
        where: { id: objectId },
        data: { folderId },
      });
      break;

    case "changeDate":
      let stringDate = formData.get("createdDate")?.toString();
      invariant(stringDate, "Must include date");

      await prisma.object.update({
        where: { id: objectId },
        data: { createdDate: convertToUTCDateTime(stringDate).toISOString() },
      });
      break;

    case "toggleHidden":
      const hidden = formData.get("hidden")?.toString() === "true";

      await prisma.object.update({
        where: { id: objectId },
        data: { hidden },
      });
      break;

    case "delete":
      await prisma.object.delete({
        where: { id: objectId },
      });
      break;
  }

  return null;
}
