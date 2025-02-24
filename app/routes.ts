import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("/download/:fileId", "routes/download.ts"),
  route("/login", "routes/login.tsx"),
  route("/admin", "routes/admin.tsx"),
  route("/kinde-auth/:index", "routes/kinde-auth.tsx"),
] satisfies RouteConfig;
