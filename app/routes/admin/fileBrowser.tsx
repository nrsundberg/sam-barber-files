import type { Route } from "./+types/fileBrowser";
import { listS3Objects } from "~/s3.server";
import S3FileBrowser from "~/components/FileBrowser";

export function meta() {
  return [{ title: "File Browser - Admin Panel" }];
}

export async function loader() {
  return listS3Objects();
}

export default function ({ loaderData }: Route.ComponentProps) {
  return <S3FileBrowser files={loaderData} />;
}
