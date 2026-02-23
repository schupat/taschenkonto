-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "hashedPassword" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "User_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Family" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Berlin',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ChildAccount" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "avatarEmoji" TEXT NOT NULL DEFAULT '🧒',
    "color" TEXT,
    "hashedPin" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ChildAccount_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "amountCents" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "origin" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "childAccountId" TEXT NOT NULL,
    "choreCompletionId" TEXT,
    "createdByUserId" TEXT,
    "revertedTransactionId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Transaction_childAccountId_fkey" FOREIGN KEY ("childAccountId") REFERENCES "ChildAccount" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Transaction_choreCompletionId_fkey" FOREIGN KEY ("choreCompletionId") REFERENCES "ChoreCompletion" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AllowanceRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "amountCents" INTEGER NOT NULL,
    "frequency" TEXT NOT NULL,
    "dayOfWeek" INTEGER,
    "dayOfMonth" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastRunAt" DATETIME,
    "nextRunAt" DATETIME NOT NULL,
    "childAccountId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AllowanceRule_childAccountId_fkey" FOREIGN KEY ("childAccountId") REFERENCES "ChildAccount" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Chore" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "rewardCents" INTEGER NOT NULL,
    "recurrence" TEXT NOT NULL DEFAULT 'ONE_TIME',
    "familyId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Chore_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ChoreAssignment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "choreId" TEXT NOT NULL,
    "childAccountId" TEXT NOT NULL,
    "dueDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ChoreAssignment_choreId_fkey" FOREIGN KEY ("choreId") REFERENCES "Chore" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ChoreAssignment_childAccountId_fkey" FOREIGN KEY ("childAccountId") REFERENCES "ChildAccount" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ChoreCompletion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "assignmentId" TEXT NOT NULL,
    "approvedByUserId" TEXT,
    "completedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" DATETIME,
    CONSTRAINT "ChoreCompletion_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "ChoreAssignment" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SavingGoal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "targetCents" INTEGER NOT NULL,
    "targetDate" DATETIME,
    "childAccountId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SavingGoal_childAccountId_fkey" FOREIGN KEY ("childAccountId") REFERENCES "ChildAccount" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_familyId_idx" ON "User"("familyId");

-- CreateIndex
CREATE INDEX "ChildAccount_familyId_idx" ON "ChildAccount"("familyId");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_choreCompletionId_key" ON "Transaction"("choreCompletionId");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_revertedTransactionId_key" ON "Transaction"("revertedTransactionId");

-- CreateIndex
CREATE INDEX "Transaction_childAccountId_idx" ON "Transaction"("childAccountId");

-- CreateIndex
CREATE INDEX "Transaction_createdAt_idx" ON "Transaction"("createdAt");

-- CreateIndex
CREATE INDEX "AllowanceRule_childAccountId_idx" ON "AllowanceRule"("childAccountId");

-- CreateIndex
CREATE INDEX "AllowanceRule_nextRunAt_idx" ON "AllowanceRule"("nextRunAt");

-- CreateIndex
CREATE INDEX "Chore_familyId_idx" ON "Chore"("familyId");

-- CreateIndex
CREATE INDEX "ChoreAssignment_childAccountId_idx" ON "ChoreAssignment"("childAccountId");

-- CreateIndex
CREATE INDEX "ChoreAssignment_choreId_idx" ON "ChoreAssignment"("choreId");

-- CreateIndex
CREATE UNIQUE INDEX "ChoreCompletion_assignmentId_key" ON "ChoreCompletion"("assignmentId");

-- CreateIndex
CREATE INDEX "SavingGoal_childAccountId_idx" ON "SavingGoal"("childAccountId");
