-- AlterTable
ALTER TABLE "Investment" ADD COLUMN "withdrawalApprovedAt" DATETIME;
ALTER TABLE "Investment" ADD COLUMN "withdrawalApprovedBy" TEXT;
ALTER TABLE "Investment" ADD COLUMN "withdrawalRequestedAt" DATETIME;
ALTER TABLE "Investment" ADD COLUMN "withdrawalStatus" TEXT;
