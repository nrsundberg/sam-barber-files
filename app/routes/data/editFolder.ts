import prisma from "~/db.server";
import type { Route } from "./+types/editFolder";
import invariant from "tiny-invariant";
import { convertToUTCDateTime } from "~/utils";
import { dataWithInfo, dataWithSuccess, dataWithWarning } from "remix-toast";

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
      return dataWithSuccess(
        { action: "Renamed Folder", ok: true },
        "Renamed Folder"
      );

    case "changeDate":
      let stringDate = formData.get("createdDate")?.toString();
      invariant(stringDate, "Must include date");

      await prisma.folder.update({
        where: { id: folderId },
        data: { createdDate: convertToUTCDateTime(stringDate).toISOString() },
      });
      return dataWithSuccess(
        { action: "Changed Date", ok: true },
        "Date of folder modified"
      );

    case "toggleHidden":
      const hidden = formData.get("hidden")?.toString() === "true";

      await prisma.folder.update({
        where: { id: folderId },
        data: { hidden },
      });
      return dataWithInfo(
        { action: "Folder vis changed", ok: true },
        hidden ? "Folder marked as hidden" : "Folder made visible"
      );

    case "delete":
      // TODO will this cascade and delete related objects
      await prisma.folder.delete({
        where: { id: folderId },
      });
      return dataWithWarning(
        { action: "Deleted Folder", ok: true },
        "Folder Deleted"
      );
  }

  return dataWithInfo({ status: "No Action" }, "No action occured");
}
