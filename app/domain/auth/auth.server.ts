import {
  createCookieSessionStorage,
  href,
  redirect,
  type unstable_MiddlewareFunction,
} from "react-router";
import { unstable_createSessionMiddleware as sessionMiddleware } from "remix-utils/middleware/session";
import invariant from "tiny-invariant";

const secretCookie = process.env.SESH_SECRET 
invariant(secretCookie)

const authSessionStorage = createCookieSessionStorage({
  cookie: {
    name: "session",
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: true,
    secrets: [secretCookie],
    maxAge: 60 * 60 * 24 * 31, // 1 month
  },
});

const [authSessionMiddleware, getAuthSessionFromContext] =
  sessionMiddleware(authSessionStorage);

export { authSessionMiddleware, getAuthSessionFromContext };

export const requireUser: unstable_MiddlewareFunction = ({ context }, next) => {
  const authSession = getAuthSessionFromContext(context);
  const session = authSession.get("user");
  if (!session) {
    throw redirect(href("/login"));
  }
  return next();
};
