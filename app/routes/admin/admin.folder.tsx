import prisma from "~/db.server";
import type { Route } from "./+types/admin.folder";
import { redirectWithWarning } from "remix-toast";
import OrderFiles from "~/components/dnd/OrderFiles";
import { cdnEndpoint } from "~/s3.server";

export async function loader({ params }: Route.LoaderArgs) {
  try {
    return {
      folder: await prisma.folder.findUniqueOrThrow({
        where: { id: params.folderId },
        include: { objects: { orderBy: { filePosition: "asc" } } },
      }),
      cdnEndpoint,
    };
  } catch (e) {
    return redirectWithWarning("/admin", "Folder not found");
  }
}

export default function ({ loaderData }: Route.ComponentProps) {
  let { folder, cdnEndpoint } = loaderData;

  if (folder.objects.length == 0) {
    return <p>NO FILES IN FOLDER...</p>;
  }
  return (
    <>
      {folder.hidden && (
        <p className="text-red-400">ALL FILES ARE HIDDEN UNDER THE FOLDER</p>
      )}
      <OrderFiles objectList={folder.objects} endpoint={cdnEndpoint} />
    </>
  );
}
