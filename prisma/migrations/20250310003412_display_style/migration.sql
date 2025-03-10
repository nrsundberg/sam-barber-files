-- CreateEnum
CREATE TYPE "DisplayStyle" AS ENUM ('LIST', 'GRID');

-- AlterTable
ALTER TABLE "Folder" ADD COLUMN     "defaultStyle" "DisplayStyle" NOT NULL DEFAULT 'GRID';
