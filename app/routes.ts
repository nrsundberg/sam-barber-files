import {
  index,
  prefix,
  route,
  type RouteConfig,
} from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),

  // Admin routes -- resricted to user loged in
  route("admin", "routes/admin/admin.tsx", [
    route(":folderId", "routes/admin/admin.folder.tsx"),
  ]),

  // Authentication routes
  route("login", "routes/auth/login.tsx"),
  route("kinde-auth/:index", "routes/auth/kinde-auth.tsx"),

  // Data and resource routes
  // Protected by index loader in data route
  route("data", "routes/data/index.ts", [
    route("reorder", "routes/data/reorder.ts"),
    route("edit", "routes/data/edit.ts"),
    route("download/:fileId", "routes/data/download.ts"),
  ]),
] satisfies RouteConfig;
