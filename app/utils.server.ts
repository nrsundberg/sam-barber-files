import { Role, type User } from "@prisma/client";
import { redirectWithError } from "remix-toast";

export async function getUserAndProtectRouteToAdminOrDeveloper(
  user: User
): Promise<User> {
  if (user.role === Role.USER) {
    throw await redirectWithError(
      "/login",
      "You are not authorized to view this page."
    );
  }
  return user;
}
