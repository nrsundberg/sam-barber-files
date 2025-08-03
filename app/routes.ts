import { index, route, type RouteConfig } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),

  // Admin routes -- resricted to user loged in
  route("admin", "routes/admin/admin.tsx", [
    route(":folderId", "routes/admin/admin.folder.tsx"),
  ]),
  route("admin/fileCheck", "routes/admin/fileCheck.tsx"),
  route("admin/fileBrowser", "routes/admin/fileBrowser.tsx"),
  route("admin/orderTrendingAndFavorite", "routes/admin/positioning.tsx"),

  // Authentication routes
  route("login", "routes/auth/login.tsx"),

  route("user", "routes/user.tsx"),

  // Data and resource routes
  // Protected by index loader in data route
  route("data", "routes/data/index.ts", [
    route("reorder/:type", "routes/data/reorder.ts"),
    route("edit/object/:objectId/:actionType", "routes/data/editObject.ts"),
    route("edit/folder/:folderId/:actionType", "routes/data/editFolder.ts"),
    route("download/:fileId", "routes/data/download.ts"),
  ]),
] satisfies RouteConfig;
