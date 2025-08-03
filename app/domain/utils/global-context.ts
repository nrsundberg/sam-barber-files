import type { User } from "@prisma/client";
import { AsyncLocalStorage } from "node:async_hooks";
import type { Session, unstable_MiddlewareFunction } from "react-router";
import { getAuthSessionFromContext } from "~/domain/auth/auth.server";
import { getUserByPhoneNumber } from "~/domain/auth/user.server";

type GlobalStorage = {
  authSession: Session;
  user: User | null;
};

const globalStorage = new AsyncLocalStorage<GlobalStorage>();

const getGlobalStorage = () => {
  const storage = globalStorage.getStore();

  if (!storage) {
    throw new Error("Storage unavailable");
  }

  return storage;
};

export const getAuthSession = () => {
  const storage = getGlobalStorage();
  return storage.authSession;
};

export const getOptionalUser = () => {
  const storage = getGlobalStorage();
  return storage.user;
};

export const getUser = () => {
  const user = getOptionalUser();
  if (!user) {
    throw new Error("User should be available here");
  }
  return user;
};

export const globalStorageMiddleware: unstable_MiddlewareFunction<
  Response
> = async ({ context }, next) => {
  const authSession = getAuthSessionFromContext(context);
  const userData = authSession.get("user");
  const user = userData?.phoneNumber
    ? await getUserByPhoneNumber(userData.phoneNumber)
    : null;
  return new Promise((resolve) => {
    globalStorage.run(
      {
        authSession,
        user,
      },
      () => {
        resolve(next());
      }
    );
  });
};
