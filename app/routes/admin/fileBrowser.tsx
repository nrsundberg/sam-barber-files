import type { Route } from "./+types/fileBrowser";
import { listS3Objects } from "~/s3.server";
import S3FileBrowser from "~/components/FileBrowser";
import { getUserAndProtectRoute } from "~/utils.server";

export function meta() {
  return [{ title: "File Browser - Admin Panel" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  let user = await getUserAndProtectRoute(request);

  return listS3Objects();
}

// TODO this page isnt locked down by auth
export default function ({ loaderData }: Route.ComponentProps) {
  return <S3FileBrowser files={loaderData} />;
}
