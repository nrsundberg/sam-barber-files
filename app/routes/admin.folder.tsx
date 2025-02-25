import prisma from "~/db.server";
import type { Route } from "./+types/admin.folder";
import { RowLayout } from "~/components/SbAccordionItem";

export async function loader({ params }: Route.LoaderArgs) {
  return prisma.object.findMany({ where: { folderId: params.folderId } });
}

export default function ({ loaderData }: Route.ComponentProps) {
  let objects = loaderData;

  if (objects.length == 0) {
    return <p className={"text-lg font-semibold"}>NO FILES IN FOLDER...</p>;
  }
  return objects.map((object) => (
    <RowLayout key={object.id} object={object} isLast={false} />
  ));
}
