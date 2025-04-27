-- CreateEnum
CREATE TYPE "ConversionStatus" AS ENUM ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "TikTokVideo" (
    "id" TEXT NOT NULL,
    "fileKey" TEXT NOT NULL,
    "objectId" TEXT,
    "status" "ConversionStatus" NOT NULL DEFAULT 'PROCESSING',

    CONSTRAINT "TikTokVideo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TikTokVideo_objectId_key" ON "TikTokVideo"("objectId");

-- AddForeignKey
ALTER TABLE "TikTokVideo" ADD CONSTRAINT "TikTokVideo_objectId_fkey" FOREIGN KEY ("objectId") REFERENCES "Object"("id") ON DELETE SET NULL ON UPDATE CASCADE;
