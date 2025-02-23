import { Link } from "react-router";
import type { Route } from "./+types/home";

export function meta() {
  return [
    { title: "Hidden Tracks" },
    {
      property: "og:title",
      content: "Hidden Tracks",
    },
    {
      name: "description",
      content: "Where fans find what they need to know.",
    },
  ];
}

// TODO: Load in folders with contents under in specified layout
export function loader() {
  return { name: "Example Loader" };
}

export default function ({ loaderData }: Route.ComponentProps) {
  return (
    <div className="text-center p-4">
      <h1 className="text-2xl">Hello, {loaderData.name}</h1>
      // TODO change this page to the actual rendering in current route "folder"
      <Link to={"downloadTest"}>Click me</Link>
    </div>
  );
}
