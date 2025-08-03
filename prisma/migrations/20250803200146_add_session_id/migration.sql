/*
  Warnings:

  - You are about to drop the column `code` on the `ValidCodes` table. All the data in the column will be lost.
  - Added the required column `otpCode` to the `ValidCodes` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sessionId` to the `ValidCodes` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ValidCodes" DROP COLUMN "code",
ADD COLUMN     "otpCode" INTEGER NOT NULL,
ADD COLUMN     "sessionId" TEXT NOT NULL;
