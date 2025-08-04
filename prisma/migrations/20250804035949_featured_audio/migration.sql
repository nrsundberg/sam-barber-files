-- CreateTable
CREATE TABLE "FeaturedAudio" (
    "id" TEXT NOT NULL,
    "objectId" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeaturedAudio_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FeaturedAudio_objectId_key" ON "FeaturedAudio"("objectId");

-- AddForeignKey
ALTER TABLE "FeaturedAudio" ADD CONSTRAINT "FeaturedAudio_objectId_fkey" FOREIGN KEY ("objectId") REFERENCES "Object"("id") ON DELETE CASCADE ON UPDATE CASCADE;
