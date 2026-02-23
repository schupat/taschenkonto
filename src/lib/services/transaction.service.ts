import { prisma } from "@/lib/prisma";

export type TransactionType =
  | "DEPOSIT"
  | "WITHDRAWAL"
  | "ADJUSTMENT"
  | "ALLOWANCE"
  | "CHORE_REWARD"
  | "INVESTMENT_DEPOSIT"
  | "INVESTMENT_WITHDRAWAL"
  | "INTEREST";

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

  return prisma.transaction.findMany({
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
  });
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

export async function getChildSaldo(childAccountId: string): Promise<number> {
  const result = await prisma.transaction.aggregate({
    where: { childAccountId },
    _sum: { amountCents: true },
  });
  return result._sum.amountCents ?? 0;
}
