import { getKindeSession } from "@kinde-oss/kinde-remix-sdk";
import type { KindeUser } from "@kinde-oss/kinde-remix-sdk/types";
import { redirectWithError } from "remix-toast";

export async function getUserAndProtectRoute(
  request: Request
): Promise<KindeUser> {
  const { getUser } = await getKindeSession(request);
  const user = await getUser();
  if (user === null) {
    throw await redirectWithError(
      "/",
      "You are not authorized to view this page."
    );
  }
  return user;
}
