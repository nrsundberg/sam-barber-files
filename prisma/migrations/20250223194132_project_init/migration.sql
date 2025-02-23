-- CreateEnum
CREATE TYPE "ObjectKind" AS ENUM ('AUDIO', 'VIDEO', 'PHOTO');

-- CreateTable
CREATE TABLE "Folder" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "folderNumber" INTEGER NOT NULL,
    "createdDate" TIMESTAMP(3) NOT NULL,
    "parentFolderId" TEXT,

    CONSTRAINT "Folder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Object" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "createdDate" TIMESTAMP(3) NOT NULL,
    "size" INTEGER NOT NULL,
    "kind" "ObjectKind" NOT NULL,
    "s3fileKey" TEXT NOT NULL,
    "folderId" TEXT NOT NULL,

    CONSTRAINT "Object_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Folder_parentFolderId_key" ON "Folder"("parentFolderId");

-- AddForeignKey
ALTER TABLE "Folder" ADD CONSTRAINT "Folder_parentFolderId_fkey" FOREIGN KEY ("parentFolderId") REFERENCES "Folder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Object" ADD CONSTRAINT "Object_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "Folder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
