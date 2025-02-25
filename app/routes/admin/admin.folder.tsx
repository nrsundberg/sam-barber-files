import prisma from "~/db.server";
import type { Route } from "./+types/admin.folder";
import { RowLayout } from "~/components/SbAccordionItem";
import { redirectWithWarning } from "remix-toast";
import SbContextMenu from "~/components/SbContextMenu";
import { useRouteLoaderData } from "react-router";

export async function loader({ params }: Route.LoaderArgs) {
  try {
    await prisma.folder.findUniqueOrThrow({ where: { id: params.folderId } });
    return prisma.object.findMany({ where: { folderId: params.folderId } });
  } catch (e) {
    return redirectWithWarning("/admin", "Folder not found");
  }
}

export default function ({ loaderData }: Route.ComponentProps) {
  let objects = loaderData;
  let folders = useRouteLoaderData("routes/admin/admin");

  if (objects.length == 0) {
    return <p>NO FILES IN FOLDER...</p>;
  }
  return objects.map((object) => (
    <SbContextMenu key={object.id} object={object} folders={folders}>
      <RowLayout object={object} isLast={false} />
    </SbContextMenu>
  ));
}
