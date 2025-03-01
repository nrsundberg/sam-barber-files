import prisma from "~/db.server";
import type { Route } from "./+types/fileCheck";
import { listS3Objects } from "~/s3.server";
import { getUserAndProtectRoute } from "~/utils.server";

export function meta() {
  return [{ title: "Files - Admin Panel" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  let user = await getUserAndProtectRoute(request);
  return listS3Objects();
}

// TODO this page isnt locked down by auth
export default function ({ loaderData }: Route.ComponentProps) {
  return <div>Coming soon...</div>;
}
