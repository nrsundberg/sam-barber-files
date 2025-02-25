import { index, route, type RouteConfig } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("download/:fileId", "routes/download.ts"),
  route("login", "routes/login.tsx"),
  route("admin", "routes/admin.tsx", [
    route(":folderId", "routes/admin.folder.tsx"),
  ]),
  route("kinde-auth/:index", "routes/kinde-auth.tsx"),
  route("data/reorder", "routes/data.reorder.ts"),
] satisfies RouteConfig;
