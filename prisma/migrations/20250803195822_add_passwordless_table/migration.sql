-- CreateTable
CREATE TABLE "ValidCodes" (
    "id" TEXT NOT NULL,
    "code" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ValidCodes_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ValidCodes" ADD CONSTRAINT "ValidCodes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
