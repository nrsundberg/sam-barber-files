import { redirect } from "react-router";

export async function loader() {
  return redirect("/kinde-auth/login");
}

export default function () {
  return (
    <div className="w-full min-h-screen items-center justify-center">
      <p>Looks like you are here by mistake...</p>
    </div>
  );
}
