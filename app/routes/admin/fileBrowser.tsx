import type { Route } from "./+types/fileBrowser";
import { listS3Objects } from "~/s3.server";
import { getUserAndProtectRoute } from "~/utils.server";
import prisma from "~/db.server";
import S3AssetManager from "~/components/S3AssetManagemen";

export function meta() {
  return [{ title: "File Browser - Admin Panel" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  let user = await getUserAndProtectRoute(request);

  // Get all S3 files
  let s3Files = await listS3Objects();

  // Get all database objects
  let dbObjects = await prisma.object.findMany();

  // Get all folders for the folder selection dropdown
  let folders = await prisma.folder.findMany({
    select: { id: true, name: true },
  });

  return {
    s3Files,
    dbObjects,
    folders,
  };

  // return listS3Objects();
}

// TODO this page isnt locked down by auth
export default function ({ loaderData }: Route.ComponentProps) {
  let { s3Files, dbObjects, folders } = loaderData;

  return (
    <S3AssetManager files={s3Files} dbObjects={dbObjects} folders={folders} />
  );
  // return <S3FileBrowser files={loaderData} />;
}
