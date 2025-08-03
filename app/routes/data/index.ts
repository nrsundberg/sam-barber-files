import prisma from "~/db.server";
import type { Route } from "./+types/index";
import { redirectWithError } from "remix-toast";

export async function loader({ request }: Route.LoaderArgs) {
  let user = await prisma.user.findUnique({ where: { id: "2185139917" } });
  if (user === null) {
    return redirectWithError("/", "Not permitted to view");
  }
  return null;
}
