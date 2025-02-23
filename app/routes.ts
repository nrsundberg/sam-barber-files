import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("/folder", "routes/folder.tsx"),
  route("/downloadTest", "routes/download.tsx"),
] satisfies RouteConfig;
