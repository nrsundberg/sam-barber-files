import { Link } from "react-router";
import RotatingBanner from "./RotatingBanner";
import type { KindeUser } from "@kinde-oss/kinde-remix-sdk/types";
import { Tooltip } from "@heroui/react";
import ScrollToTopButton from "./ScrollToTop";

export default function ({ user }: { user: KindeUser | null }) {
  return (
    <header className="sticky top-0 z-50 border-b-2 border-white bg-opacity-100 overflow-hidden bg-black">
      <RotatingBanner />
      <div className="px-1 py-1 md:px-10 md:py-3 flex justify-between items-center">
        <Link to={"/"} className="font-bold md:text-2xl">
          SAM BARBER FILES
        </Link>
        <nav className="inline-flex gap-2">
          {user && (
            <>
              <Tooltip content={"This only shows for logged in sessions"}>
                <Link to={"/admin"} className="font-bold border-2 p-2 rounded">
                  Admin Panel
                </Link>
              </Tooltip>
              <Tooltip content={"This only shows for logged in sessions"}>
                <Link
                  to={"/kinde-auth/logout"}
                  className="font-bold border-2 p-2 rounded"
                >
                  Logout
                </Link>
              </Tooltip>
            </>
          )}
          <ScrollToTopButton />
        </nav>
      </div>
    </header>
  );
}
