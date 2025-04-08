-- DropForeignKey
ALTER TABLE "Object" DROP CONSTRAINT "Object_folderId_fkey";

-- AlterTable
ALTER TABLE "Object" ADD COLUMN     "isLocked" BOOLEAN NOT NULL DEFAULT false;

-- AddForeignKey
ALTER TABLE "Object" ADD CONSTRAINT "Object_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "Folder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
