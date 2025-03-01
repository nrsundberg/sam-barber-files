/*
  Warnings:

  - A unique constraint covering the columns `[s3fileKey]` on the table `Object` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Object_s3fileKey_key" ON "Object"("s3fileKey");
