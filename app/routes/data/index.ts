import { getKindeSession } from "@kinde-oss/kinde-remix-sdk";
import type { Route } from "./+types/index";
import { redirectWithError } from "remix-toast";

export async function loader({ request }: Route.LoaderArgs) {
  let { getUser } = await getKindeSession(request);
  let user = await getUser();
  if (user === null) {
    return redirectWithError("/", "Not permitted to view");
  }
  return null;
}
