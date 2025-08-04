import { Link } from "react-router";
import RotatingBanner from "./RotatingBanner";
import { Tooltip } from "@heroui/react";
import ScrollToTopButton from "./ScrollToTop";
import { Role, type User } from "@prisma/client";

export default function ({ user }: { user: User | null }) {
  return (
    <header className="sticky top-0 z-50 border-b-2 border-white bg-opacity-100 overflow-hidden bg-black">
      <RotatingBanner />
      <div className="px-1 py-1 md:px-10 md:py-3 flex justify-between items-center">
        <Link to={"/"} className="font-bold text-lg md:text-3xl">
          SAM BARBER FILES
        </Link>
        <nav className="inline-flex gap-2">
          {user ? (
            <>
              {user.role === Role.ADMIN && (
                <Tooltip content={"This only shows for logged in sessions"}>
                  <Link
                    to={"/admin"}
                    className="font-bold border-2 p-2 rounded"
                  >
                    Admin Panel
                  </Link>
                </Tooltip>
              )}
              <Link to={"/logout"} className="font-bold border-2 p-2 rounded">
                Logout
              </Link>
            </>
          ) : (
            <Link to={"/login"} className="font-bold border-2 p-2 rounded">
              Login
            </Link>
          )}
          <ScrollToTopButton />
        </nav>
      </div>
    </header>
  );
}
