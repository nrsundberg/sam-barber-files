import { getUserAndProtectRouteToAdminOrDeveloper } from "~/utils.server";
import type { Route } from "./+types/index";
import { getUser } from "~/domain/utils/global-context";

export async function loader({ request }: Route.LoaderArgs) {
  let user = getUser();
  await getUserAndProtectRouteToAdminOrDeveloper(user);
  return null;
}
