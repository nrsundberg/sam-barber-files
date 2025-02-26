import prisma from "~/db.server";
import type { Route } from "./+types/admin.folder";
import { redirectWithWarning } from "remix-toast";
import OrderFiles from "~/components/OrderFiles";

export async function loader({ params }: Route.LoaderArgs) {
  try {
    return {
      folder: await prisma.folder.findUniqueOrThrow({
        where: { id: params.folderId },
        include: { objects: { orderBy: { filePosition: "asc" } } },
      }),
    };
  } catch (e) {
    return redirectWithWarning("/admin", "Folder not found");
  }
}

export default function ({ loaderData }: Route.ComponentProps) {
  let { folder } = loaderData;

  if (folder.objects.length == 0) {
    return <p>NO FILES IN FOLDER...</p>;
  }
  return (
    <>
      {folder.hidden && (
        <p className="text-red-400">ALL FILES ARE HIDDEN UNDER THE FOLDER</p>
      )}
      <OrderFiles objectList={folder.objects} />
    </>
  );
}
