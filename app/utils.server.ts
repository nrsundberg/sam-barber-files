// import { getKindeSession } from "@kinde-oss/kinde-remix-sdk";
// import type { KindeUser } from "@kinde-oss/kinde-remix-sdk/types";
import type { User } from "@prisma/client";
import { redirectWithError } from "remix-toast";
import prisma from "~/db.server";

export async function getUserAndProtectRoute(
  request: Request
): Promise<User> {
  let user = await prisma.user.findUnique({where: {phoneNumber: "2185139917"}})
  if (user === null) {
    throw await redirectWithError(
      "/login",
      "You are not authorized to view this page."
    );
  }
  return user;
}
