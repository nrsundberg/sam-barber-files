import {
  data,
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLocation,
} from "react-router";

import type { Route } from "./+types/root";
import "./app.css";
import { HeroUIProvider } from "@heroui/react";
import { getToast } from "remix-toast";
import { useEffect } from "react";
import { ToastContainer, toast as notify } from "react-toastify";
import toastStyles from "react-toastify/ReactToastify.css?url";
import { getKindeSession } from "@kinde-oss/kinde-remix-sdk";
import ReactGA from "react-ga4";
import SbNavbar from "./components/SbNavbar";

// Add the toast stylesheet
export const links: Route.LinksFunction = () => [
  { rel: "stylesheet", href: toastStyles },
  {
    rel: "icon",
    href: "/favicon.svg",
  },
];

export async function loader({ request }: Route.LoaderArgs) {
  let { getUser } = await getKindeSession(request);
  const { toast, headers } = await getToast(request);
  // Important to pass in the headers so the toast is cleared properly
  return data({ toast, user: await getUser() }, { headers });
}

export default function App({ loaderData }: Route.ComponentProps) {
  let { toast, user } = loaderData;
  let location = useLocation();

  useEffect(() => {
    ReactGA.initialize("G-3KL2MQ8DYM");
    ReactGA.send({ hitType: "pageview", page: location.pathname });
  }, [location]);

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
          <SbNavbar user={user} />
          <Outlet />
          <ScrollRestoration />
          <Scripts />
          <ToastContainer stacked />
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
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="pt-16 p-4 container mx-auto">
      <h1>{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre className="w-full p-4 overflow-x-auto">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
