import { prisma } from "@/lib/prisma";
import type { TransactionType } from "@prisma/client";

export type { TransactionType };

export async function getTransactions(
  childAccountId: string,
  familyId: string,
  opts?: { limit?: number; cursor?: string; type?: TransactionType }
) {
  // Verify child belongs to family
  const child = await prisma.childAccount.findFirst({
    where: { id: childAccountId, familyId },
    select: { id: true },
  });
  if (!child) return [];

  const transactions = await prisma.transaction.findMany({
    where: {
      childAccountId,
      ...(opts?.type ? { type: opts.type } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: opts?.limit || 50,
    ...(opts?.cursor
      ? {
          skip: 1,
          cursor: { id: opts.cursor },
        }
      : {}),
    select: {
      id: true,
      amountCents: true,
      type: true,
      origin: true,
      description: true,
      createdAt: true,
      revertedTransactionId: true,
    },
  });

  // Batch-check which transactions have been reverted by another transaction
  const txIds = transactions.map((tx) => tx.id);
  const reverters = await prisma.transaction.findMany({
    where: { revertedTransactionId: { in: txIds } },
    select: { revertedTransactionId: true },
  });
  const revertedIds = new Set(reverters.map((r) => r.revertedTransactionId));

  return transactions.map((tx) => ({
    ...tx,
    isReverted: revertedIds.has(tx.id),
  }));
}

export async function createTransaction(
  childAccountId: string,
  familyId: string,
  data: {
    amountCents: number;
    type: "DEPOSIT" | "WITHDRAWAL" | "ADJUSTMENT";
    description: string;
    createdByUserId?: string;
  }
) {
  // Verify child belongs to family
  const child = await prisma.childAccount.findFirst({
    where: { id: childAccountId, familyId },
    select: { id: true },
  });
  if (!child) throw new Error("Child not found");

  // Convert sign: WITHDRAWAL is negative, DEPOSIT/ADJUSTMENT positive
  const signedAmount =
    data.type === "WITHDRAWAL"
      ? -Math.abs(data.amountCents)
      : Math.abs(data.amountCents);

  return prisma.transaction.create({
    data: {
      amountCents: signedAmount,
      type: data.type,
      origin: "MANUAL",
      description: data.description,
      childAccountId,
      createdByUserId: data.createdByUserId,
    },
  });
}

export async function revertTransaction(
  transactionId: string,
  childAccountId: string,
  familyId: string,
  userId: string
) {
  // Verify child belongs to family
  const child = await prisma.childAccount.findFirst({
    where: { id: childAccountId, familyId },
    select: { id: true },
  });
  if (!child) throw new Error("Child not found");

  // Find original transaction
  const original = await prisma.transaction.findFirst({
    where: { id: transactionId, childAccountId },
  });
  if (!original) throw new Error("Transaction not found");

  // Reject if this transaction is itself a revert
  if (original.revertedTransactionId) {
    throw new Error("Cannot revert a revert transaction");
  }

  // Reject if already reverted (another tx points to this one)
  const existingRevert = await prisma.transaction.findUnique({
    where: { revertedTransactionId: transactionId },
    select: { id: true },
  });
  if (existingRevert) throw new Error("Transaction already reverted");

  return prisma.transaction.create({
    data: {
      amountCents: -original.amountCents,
      type: "ADJUSTMENT",
      origin: "MANUAL",
      description: `Storno: ${original.description}`,
      childAccountId,
      createdByUserId: userId,
      revertedTransactionId: transactionId,
    },
  });
}

export async function getChildSaldo(childAccountId: string): Promise<number> {
  const result = await prisma.transaction.aggregate({
    where: { childAccountId },
    _sum: { amountCents: true },
  });
  return result._sum.amountCents ?? 0;
}
