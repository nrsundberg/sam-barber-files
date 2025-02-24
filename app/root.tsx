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
import { HeroUIProvider, Navbar, NavbarBrand } from "@heroui/react";
import { getToast } from "remix-toast";
import { useEffect } from "react";
import { ToastContainer, toast as notify } from "react-toastify";
import toastStyles from "react-toastify/ReactToastify.css?url";

// Add the toast stylesheet
export const links: Route.LinksFunction = () => [
  { rel: "stylesheet", href: toastStyles },
];

export async function loader({ request }: Route.LoaderArgs) {
  // Extracts the toast from the request
  const { toast, headers } = await getToast(request);
  // Important to pass in the headers so the toast is cleared properly
  return data({ toast }, { headers });
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <Navbar maxWidth="full" isBordered isBlurred>
          <NavbarBrand>
            <Link to="/">
              <img src="/logo.jpg" alt="Logo" width={50} height={50} />
            </Link>
          </NavbarBrand>
        </Navbar>
        {children}
        <ScrollRestoration />
        <Scripts />
        <ToastContainer />
      </body>
    </html>
  );
}

export default function App({ loaderData }: Route.ComponentProps) {
  const { toast } = loaderData;
  // Hook to show the toasts
  useEffect(() => {
    if (toast) {
      // notify on a toast message
      notify(toast.message, { type: toast.type, theme: "dark" });
    }
  }, [toast]);

  return (
    <HeroUIProvider>
      <Outlet />
    </HeroUIProvider>
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
