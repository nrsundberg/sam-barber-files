/*
  Warnings:

  - You are about to drop the column `cloudFlareId` on the `Object` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Object" DROP COLUMN "cloudFlareId";
