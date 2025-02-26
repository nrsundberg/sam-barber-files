import prisma from "~/db.server";
import type { Route } from "./+types/editObject";
import invariant from "tiny-invariant";
import { convertToUTCDateTime } from "~/utils";
import { dataWithInfo, dataWithSuccess, dataWithWarning } from "remix-toast";

export async function action({ request, params }: Route.ActionArgs) {
  let formData = await request.formData();
  let { actionType, objectId } = params;

  switch (actionType) {
    case "rename":
      let fileName = formData.get("fileName")?.toString();
      invariant(fileName, "Must include file name");

      await prisma.object.update({
        where: { id: objectId },
        data: { fileName },
      });
      return dataWithSuccess(
        { action: "Renamed File", ok: true },
        "File Renamed",
      );

    case "move":
      let folderId = formData.get("folderId")?.toString();
      invariant(folderId, "Must include folderId");

      await prisma.object.update({
        where: { id: objectId },
        data: { folderId },
      });
      return dataWithInfo({ action: "File Moved", ok: true }, "File Moved");

    case "changeDate":
      let stringDate = formData.get("createdDate")?.toString();
      invariant(stringDate, "Must include date");

      await prisma.object.update({
        where: { id: objectId },
        data: { createdDate: convertToUTCDateTime(stringDate).toISOString() },
      });
      return dataWithSuccess(
        { action: "Changed Date", ok: true },
        "Date Updated",
      );

    case "toggleHidden":
      const hidden = formData.get("hidden")?.toString() === "true";

      await prisma.object.update({
        where: { id: objectId },
        data: { hidden },
      });
      return dataWithInfo(
        { action: "File vis changed", ok: true },
        hidden ? "File marked as hidden" : "Folder made visible",
      );

    case "delete":
      await prisma.object.delete({
        where: { id: objectId },
      });
      return dataWithWarning(
        { action: "Deleted Folder", ok: true },
        "Folder Deleted",
      );

    case "favorite":
      const isFavorite = formData.get("isFavorite")?.toString() === "true";
      await prisma.object.update({
        where: { id: objectId },
        data: { isFavorite },
      });
      return { action: "Updated favorite", ok: true };

    case "trending":
      const isTrending = formData.get("isTrending")?.toString() === "true";
      await prisma.object.update({
        where: { id: objectId },
        data: { isTrending },
      });
      return { action: "Updated trending", ok: true };
  }

  return dataWithInfo({ status: "No Action" }, "No action occured");
}
