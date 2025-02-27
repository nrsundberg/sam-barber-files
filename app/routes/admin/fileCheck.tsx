import prisma from "~/db.server";
import type { Route } from "./+types/fileCheck";
import { listS3Objects } from "~/s3.server";

export function meta() {
  return [{ title: "Files - Admin Panel" }];
}

export async function loader() {
  return listS3Objects();
}

export default function ({ loaderData }: Route.ComponentProps) {
  return <div>HELLO</div>;
}
