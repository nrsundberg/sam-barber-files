import { redirect } from "react-router";
import type { Route } from "./+types/logout";
import { signoutUser } from "~/domain/auth/user.server";

export async function loader({ request }: Route.LoaderArgs) {
  signoutUser();
  let searchParams = new URL(request.url).searchParams;
  let redirectTo = searchParams.get("redirectTo");
  throw redirect(redirectTo ?? "/");
}
