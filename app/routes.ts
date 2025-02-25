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
  ...prefix("data", [
    route("reorder", "routes/data/reorder.ts"),
    route("download/:fileId", "routes/data/download.ts"),
  ]),
] satisfies RouteConfig;
