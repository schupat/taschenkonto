-- AlterTable
ALTER TABLE "ChildAccount" ADD COLUMN     "pinChangedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "LoginAttempt" (
    "id" TEXT NOT NULL,
    "rateKey" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "firstAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedUntil" TIMESTAMP(3),

    CONSTRAINT "LoginAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LoginAttempt_rateKey_key" ON "LoginAttempt"("rateKey");

-- CreateIndex
CREATE INDEX "LoginAttempt_rateKey_idx" ON "LoginAttempt"("rateKey");
