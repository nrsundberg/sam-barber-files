/*
  Warnings:

  - You are about to drop the column `sessionId` on the `ValidCodes` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `ValidCodes` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[otpCode,phoneNumber]` on the table `ValidCodes` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `phoneNumber` to the `ValidCodes` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "ValidCodes" DROP CONSTRAINT "ValidCodes_userId_fkey";

-- AlterTable
ALTER TABLE "ValidCodes" DROP COLUMN "sessionId",
DROP COLUMN "userId",
ADD COLUMN     "phoneNumber" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "ValidCodes_otpCode_phoneNumber_key" ON "ValidCodes"("otpCode", "phoneNumber");
