import type { Prisma } from "@prisma/client";

export type FolderWithObjects = Prisma.FolderGetPayload<{
  include: { objects: true };
}>;
