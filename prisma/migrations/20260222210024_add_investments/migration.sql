-- CreateTable
CREATE TABLE "Investment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "principalCents" INTEGER NOT NULL,
    "currentBalanceCents" INTEGER NOT NULL,
    "interestRateBps" INTEGER NOT NULL,
    "termMonths" INTEGER,
    "startDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "maturityDate" DATETIME,
    "nextInterestAt" DATETIME NOT NULL,
    "lastInterestAt" DATETIME,
    "childAccountId" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Investment_childAccountId_fkey" FOREIGN KEY ("childAccountId") REFERENCES "ChildAccount" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Family" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Berlin',
    "kioskInvestmentsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Family" ("createdAt", "currency", "id", "name", "timezone", "updatedAt") SELECT "createdAt", "currency", "id", "name", "timezone", "updatedAt" FROM "Family";
DROP TABLE "Family";
ALTER TABLE "new_Family" RENAME TO "Family";
CREATE TABLE "new_Transaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "amountCents" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "origin" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "childAccountId" TEXT NOT NULL,
    "choreCompletionId" TEXT,
    "investmentId" TEXT,
    "createdByUserId" TEXT,
    "revertedTransactionId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Transaction_childAccountId_fkey" FOREIGN KEY ("childAccountId") REFERENCES "ChildAccount" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Transaction_choreCompletionId_fkey" FOREIGN KEY ("choreCompletionId") REFERENCES "ChoreCompletion" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Transaction_investmentId_fkey" FOREIGN KEY ("investmentId") REFERENCES "Investment" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Transaction" ("amountCents", "childAccountId", "choreCompletionId", "createdAt", "createdByUserId", "description", "id", "origin", "revertedTransactionId", "type") SELECT "amountCents", "childAccountId", "choreCompletionId", "createdAt", "createdByUserId", "description", "id", "origin", "revertedTransactionId", "type" FROM "Transaction";
DROP TABLE "Transaction";
ALTER TABLE "new_Transaction" RENAME TO "Transaction";
CREATE UNIQUE INDEX "Transaction_choreCompletionId_key" ON "Transaction"("choreCompletionId");
CREATE UNIQUE INDEX "Transaction_revertedTransactionId_key" ON "Transaction"("revertedTransactionId");
CREATE INDEX "Transaction_childAccountId_idx" ON "Transaction"("childAccountId");
CREATE INDEX "Transaction_createdAt_idx" ON "Transaction"("createdAt");
CREATE INDEX "Transaction_investmentId_idx" ON "Transaction"("investmentId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Investment_childAccountId_idx" ON "Investment"("childAccountId");

-- CreateIndex
CREATE INDEX "Investment_familyId_idx" ON "Investment"("familyId");

-- CreateIndex
CREATE INDEX "Investment_nextInterestAt_idx" ON "Investment"("nextInterestAt");

-- CreateIndex
CREATE INDEX "Investment_status_idx" ON "Investment"("status");
