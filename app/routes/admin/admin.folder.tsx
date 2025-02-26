import prisma from "~/db.server";
import type { Route } from "./+types/admin.folder";
import { redirectWithWarning } from "remix-toast";
import OrderFiles from "~/components/OrderFiles";

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

  if (objects.length == 0) {
    return <p>NO FILES IN FOLDER...</p>;
  }
  return <OrderFiles objectList={objects} />;
}
