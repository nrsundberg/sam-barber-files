import {
  data,
  isRouteErrorResponse,
  Link,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";

import type { Route } from "./+types/root";
import "./app.css";
import {
  HeroUIProvider,
  Navbar,
  NavbarBrand,
  NavbarItem,
  Tooltip,
} from "@heroui/react";
import { getToast } from "remix-toast";
import { useEffect } from "react";
import { ToastContainer, toast as notify } from "react-toastify";
import toastStyles from "react-toastify/ReactToastify.css?url";
import ScrollToTopButton from "./components/ScrollToTop";
import { getKindeSession } from "@kinde-oss/kinde-remix-sdk";

// Add the toast stylesheet
export const links: Route.LinksFunction = () => [
  { rel: "stylesheet", href: toastStyles },
];

export async function loader({ request }: Route.LoaderArgs) {
  let { getUser } = await getKindeSession(request);
  const { toast, headers } = await getToast(request);
  // Important to pass in the headers so the toast is cleared properly
  return data({ toast, user: await getUser() }, { headers });
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
          <Navbar
            maxWidth="full"
            isBordered
            isBlurred
            className="bg-slate-50 text-black"
          >
            <NavbarBrand>
              <Link to={"/"} className="font-bold md:text-2xl">
                SAM BARBER FILES
              </Link>
            </NavbarBrand>
            {user && (
              <>
                <NavbarItem>
                  <Tooltip content={"This only shows for logged in sessions"}>
                    <Link
                      to={"/admin"}
                      className="text-black font-bold border-2 p-2 rounded"
                    >
                      Admin Panel
                    </Link>
                  </Tooltip>
                </NavbarItem>
                <NavbarItem>
                  <Tooltip content={"This only shows for logged in sessions"}>
                    <Link
                      to={"/kinde-auth/logout"}
                      className="text-black font-bold border-2 p-2 rounded"
                    >
                      Logout
                    </Link>
                  </Tooltip>
                </NavbarItem>
              </>
            )}
            <NavbarItem>
              <ScrollToTopButton />
            </NavbarItem>
          </Navbar>
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
