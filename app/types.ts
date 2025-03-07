import type { Prisma } from "@prisma/client";

export type FolderWithObjects = Prisma.FolderGetPayload<{
  include: { objects: true };
}>;

export interface S3Object {
  key: string;
  size: number;
  lastModified: Date;
  etag: string;
  storageClass: string;
}
