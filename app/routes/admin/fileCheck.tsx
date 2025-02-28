import type { Route } from "./+types/fileCheck";
import { listS3Objects } from "~/s3.server";

export function meta() {
  return [{ title: "Files - Admin Panel" }];
}

export async function loader({}: Route.LoaderArgs) {
  return listS3Objects();
}

export default function ({ loaderData }: Route.ComponentProps) {
  return <div>Coming soon...</div>;
}
