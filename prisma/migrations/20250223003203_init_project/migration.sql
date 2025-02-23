-- CreateEnum
CREATE TYPE "ObjectKind" AS ENUM ('FOLDER', 'AUDIO', 'VIDEO');

-- CreateTable
CREATE TABLE "Folder" (
    "id" TEXT NOT NULL,
    "folderNumber" INTEGER NOT NULL,

    CONSTRAINT "Folder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Object" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "createdDate" TIMESTAMP(3) NOT NULL,
    "size" BIGINT NOT NULL,
    "kind" "ObjectKind" NOT NULL,
    "s3fileKey" TEXT NOT NULL,
    "folderId" TEXT NOT NULL,

    CONSTRAINT "Object_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Object" ADD CONSTRAINT "Object_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "Folder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
