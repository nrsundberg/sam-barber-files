import {
  data,
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  type unstable_MiddlewareFunction,
} from "react-router";

import type { Route } from "./+types/root";
import styles from "./app.css?url";
import { HeroUIProvider } from "@heroui/react";
import { getToast } from "remix-toast";
import { useEffect } from "react";
import { ToastContainer, toast as notify } from "react-toastify";
import toastStyles from "react-toastify/ReactToastify.css?url";
import SbNavbar from "./components/SbNavbar";
import { MediaCacheProvider } from "~/contexts/MediaCacheContext";
import {
  getOptionalUser,
  globalStorageMiddleware,
} from "~/domain/utils/global-context";
import { authSessionMiddleware } from "~/domain/auth/auth.server";

// Add the toast stylesheet
export const links: Route.LinksFunction = () => [
  { rel: "stylesheet", href: styles },
  { rel: "stylesheet", href: toastStyles },
  {
    rel: "icon",
    href: "/favicon.svg",
  },
];

export const unstable_middleware: unstable_MiddlewareFunction<Response>[] = [
  authSessionMiddleware,
  globalStorageMiddleware,
];

export async function loader({ request }: Route.LoaderArgs) {
  let user = getOptionalUser();
  const { toast, headers } = await getToast(request);
  // Important to pass in the headers so the toast is cleared properly
  return data({ toast, user }, { headers });
}

// export function Layout({
export default function App({ loaderData }: Route.ComponentProps) {
  let { toast, user } = loaderData;

  // Hook to show the toasts
  useEffect(() => {
    if (toast) {
      // notify on a toast message
      notify(toast.message, { type: toast.type, theme: "dark" });
    }
  }, [toast]);

  return (
    <html lang="en" className="dark">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="text-xs md:text-medium">
        <HeroUIProvider>
          <MediaCacheProvider>
            <SbNavbar user={user} />
            <Outlet />
            <ScrollRestoration />
            <Scripts />
            <ToastContainer stacked />
          </MediaCacheProvider>
        </HeroUIProvider>
      </body>
    </html>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404
        ? "The requested page could not be found."
        : error.statusText || details;
  } else if (error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <html lang="en" className="dark">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="text-xs md:text-medium">
        <HeroUIProvider>
          <SbNavbar user={null} />
          <main className="pt-16 p-4 container mx-auto">
            <h1>{message}</h1>
            <p>{details}</p>
            {stack && (
              <pre className="w-full p-4 overflow-x-auto">
                <code>{stack}</code>
              </pre>
            )}
          </main>
          <Outlet />
          <ScrollRestoration />
          <Scripts />
          <ToastContainer stacked />
        </HeroUIProvider>
      </body>
    </html>
  );
}
