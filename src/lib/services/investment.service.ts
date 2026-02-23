import { prisma } from "@/lib/prisma";
import type { InvestmentType } from "@prisma/client";

// Re-export pure function from shared module (safe for client import)
export { getInvestmentProjection } from "@/lib/investment-projection";

// ─── Queries ────────────────────────────────────────────────

export async function getInvestments(
  childAccountId: string,
  familyId: string
) {
  const child = await prisma.childAccount.findFirst({
    where: { id: childAccountId, familyId },
    select: { id: true },
  });
  if (!child) return [];

  return prisma.investment.findMany({
    where: { childAccountId, familyId },
    orderBy: { createdAt: "desc" },
  });
}

export async function getInvestment(
  investmentId: string,
  childAccountId: string,
  familyId: string
) {
  return prisma.investment.findFirst({
    where: { id: investmentId, childAccountId, familyId },
  });
}

export async function getFamilyInvestments(familyId: string) {
  return prisma.investment.findMany({
    where: { familyId },
    include: {
      childAccount: { select: { id: true, name: true, avatarEmoji: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

// ─── Commands ───────────────────────────────────────────────

export async function createInvestment(
  childAccountId: string,
  familyId: string,
  data: {
    type: InvestmentType;
    amountCents: number;
    interestRateBps: number;
    termMonths?: number;
  }
) {
  // Verify child belongs to family
  const child = await prisma.childAccount.findFirst({
    where: { id: childAccountId, familyId },
    select: { id: true },
  });
  if (!child) throw new Error("Child not found");

  const now = new Date();
  const nextInterestAt = computeNextInterestDate(now);
  const maturityDate =
    data.type === "FESTGELD" && data.termMonths
      ? computeMaturityDate(now, data.termMonths)
      : null;

  const description =
    data.type === "TAGESGELD"
      ? "Anlage: Tagesgeld"
      : `Anlage: Festgeld (${data.termMonths} Monate)`;

  // VULN-05 fix: Interactive transaction — balance check + writes are atomic
  return prisma.$transaction(async (tx) => {
    const saldoResult = await tx.transaction.aggregate({
      where: { childAccountId },
      _sum: { amountCents: true },
    });
    const saldo = saldoResult._sum.amountCents ?? 0;
    if (saldo < data.amountCents) {
      throw new Error("Insufficient balance");
    }

    const investment = await tx.investment.create({
      data: {
        type: data.type,
        status: "ACTIVE",
        principalCents: data.amountCents,
        currentBalanceCents: data.amountCents,
        interestRateBps: data.interestRateBps,
        termMonths: data.termMonths ?? null,
        startDate: now,
        maturityDate,
        nextInterestAt,
        childAccountId,
        familyId,
      },
    });

    await tx.transaction.create({
      data: {
        amountCents: -Math.abs(data.amountCents),
        type: "INVESTMENT_DEPOSIT",
        origin: "INVESTMENT",
        description,
        childAccountId,
        investmentId: investment.id,
      },
    });

    return investment;
  });
}

export async function withdrawInvestment(
  investmentId: string,
  childAccountId: string,
  familyId: string
) {
  // Interactive $transaction: status check + writes are atomic (prevents double-withdrawal)
  return prisma.$transaction(async (tx) => {
    const investment = await tx.investment.findFirst({
      where: { id: investmentId, childAccountId, familyId, status: { not: "WITHDRAWN" } },
    });
    if (!investment) throw new Error("Investment not found");

    // Festgeld: only allow withdrawal if matured
    if (investment.type === "FESTGELD" && investment.status === "ACTIVE") {
      throw new Error("Festgeld has not matured yet");
    }

    const withdrawAmount = investment.currentBalanceCents;
    const description =
      investment.type === "TAGESGELD"
        ? "Auszahlung: Tagesgeld"
        : "Auszahlung: Festgeld (fällig)";

    await tx.investment.update({
      where: { id: investmentId },
      data: { status: "WITHDRAWN" },
    });

    await tx.transaction.create({
      data: {
        amountCents: Math.abs(withdrawAmount), // Positive: money returns to balance
        type: "INVESTMENT_WITHDRAWAL",
        origin: "INVESTMENT",
        description,
        childAccountId,
        investmentId,
      },
    });

    return { withdrawnCents: withdrawAmount };
  });
}

// ─── Top-Up (Nachzahlen) ─────────────────────────────────────

export async function topUpInvestment(
  investmentId: string,
  childAccountId: string,
  familyId: string,
  additionalCents: number
) {
  const investment = await prisma.investment.findFirst({
    where: { id: investmentId, childAccountId, familyId },
  });
  if (!investment) throw new Error("Investment not found");
  if (investment.type !== "TAGESGELD") throw new Error("Only Tagesgeld can be topped up");
  if (investment.status !== "ACTIVE") throw new Error("Investment is not active");

  // VULN-05 fix: Interactive transaction — balance check + writes are atomic
  return prisma.$transaction(async (tx) => {
    const saldoResult = await tx.transaction.aggregate({
      where: { childAccountId },
      _sum: { amountCents: true },
    });
    const saldo = saldoResult._sum.amountCents ?? 0;
    if (saldo < additionalCents) {
      throw new Error("Insufficient balance");
    }

    await tx.investment.update({
      where: { id: investmentId },
      data: {
        principalCents: { increment: additionalCents },
        currentBalanceCents: { increment: additionalCents },
      },
    });

    await tx.transaction.create({
      data: {
        amountCents: -Math.abs(additionalCents),
        type: "INVESTMENT_DEPOSIT",
        origin: "INVESTMENT",
        description: "Nachzahlung: Tagesgeld",
        childAccountId,
        investmentId,
      },
    });

    return tx.investment.findUnique({ where: { id: investmentId } });
  });
}

// ─── Withdrawal Approval Flow ────────────────────────────────

export async function requestWithdrawal(
  investmentId: string,
  childAccountId: string,
  familyId: string
) {
  const investment = await prisma.investment.findFirst({
    where: { id: investmentId, childAccountId, familyId },
  });
  if (!investment) throw new Error("Investment not found");
  if (investment.status === "WITHDRAWN") throw new Error("Already withdrawn");
  if (investment.type === "FESTGELD" && investment.status === "ACTIVE") {
    throw new Error("Festgeld has not matured yet");
  }
  if (investment.withdrawalStatus === "PENDING") {
    throw new Error("Withdrawal already pending");
  }

  return prisma.investment.update({
    where: { id: investmentId },
    data: {
      withdrawalStatus: "PENDING",
      withdrawalRequestedAt: new Date(),
    },
  });
}

export async function approveWithdrawal(
  investmentId: string,
  familyId: string,
  userId: string
) {
  // Interactive $transaction: status check + writes are atomic (prevents double-approval)
  return prisma.$transaction(async (tx) => {
    const investment = await tx.investment.findFirst({
      where: { id: investmentId, familyId, withdrawalStatus: "PENDING" },
    });
    if (!investment) throw new Error("No pending withdrawal found");

    const withdrawAmount = investment.currentBalanceCents;
    const description =
      investment.type === "TAGESGELD"
        ? "Auszahlung: Tagesgeld"
        : "Auszahlung: Festgeld (fällig)";

    await tx.investment.update({
      where: { id: investmentId },
      data: {
        status: "WITHDRAWN",
        withdrawalStatus: "APPROVED",
        withdrawalApprovedAt: new Date(),
        withdrawalApprovedBy: userId,
      },
    });

    await tx.transaction.create({
      data: {
        amountCents: Math.abs(withdrawAmount),
        type: "INVESTMENT_WITHDRAWAL",
        origin: "INVESTMENT",
        description,
        childAccountId: investment.childAccountId,
        investmentId,
      },
    });

    return { withdrawnCents: withdrawAmount };
  });
}

export async function rejectWithdrawal(
  investmentId: string,
  familyId: string
) {
  const investment = await prisma.investment.findFirst({
    where: { id: investmentId, familyId, withdrawalStatus: "PENDING" },
  });
  if (!investment) throw new Error("No pending withdrawal found");

  return prisma.investment.update({
    where: { id: investmentId },
    data: {
      withdrawalStatus: "REJECTED",
      withdrawalRequestedAt: null,
    },
  });
}

export async function getPendingWithdrawals(familyId: string) {
  return prisma.investment.findMany({
    where: { familyId, withdrawalStatus: "PENDING" },
    include: {
      childAccount: { select: { id: true, name: true, avatarEmoji: true } },
    },
  });
}

// ─── Cron: Process Interest ─────────────────────────────────

/**
 * Process compound interest for all active investments.
 * Idempotent: advancing nextInterestAt in the same transaction
 * as updating the balance prevents double-crediting.
 */
export async function processInvestments() {
  const now = new Date();

  // 1. Find all active investments due for interest
  const dueInvestments = await prisma.investment.findMany({
    where: {
      status: "ACTIVE",
      nextInterestAt: { lte: now },
    },
  });

  let processed = 0;

  for (const inv of dueInvestments) {
    const interestCents = Math.floor(
      (inv.currentBalanceCents * inv.interestRateBps) / (10000 * 12)
    );

    const nextInterestAt = computeNextInterestDate(now);
    const rateDisplay = (inv.interestRateBps / 100).toFixed(2);

    // Fully atomic: claim + balance update + audit tx in one interactive transaction.
    // Prevents lost interest on crash and stale-read overwrites from concurrent processes.
    await prisma.$transaction(async (tx) => {
      const claimed = await tx.investment.updateMany({
        where: { id: inv.id, nextInterestAt: { lte: now } },
        data: { lastInterestAt: now, nextInterestAt },
      });
      if (claimed.count === 0) return; // Another process already handled this

      if (interestCents > 0) {
        // Use increment to avoid lost-update races with concurrent top-ups/withdrawals
        await tx.investment.update({
          where: { id: inv.id },
          data: { currentBalanceCents: { increment: interestCents } },
        });

        await tx.transaction.create({
          data: {
            amountCents: 0, // Interest stays inside investment, not added to liquid saldo
            type: "INTEREST",
            origin: "INVESTMENT",
            description: `Zinsen: +${interestCents} Cent (${rateDisplay}% p.a.)`,
            childAccountId: inv.childAccountId,
            investmentId: inv.id,
          },
        });
      }
    });

    processed++;
  }

  // 2. Mature any Festgeld investments past their maturity date
  const maturedCount = await matureInvestments(now);

  return { interestProcessed: processed, matured: maturedCount };
}

async function matureInvestments(now: Date): Promise<number> {
  // Atomic: update all mature investments in a single query (idempotent, concurrent-safe)
  const result = await prisma.investment.updateMany({
    where: {
      status: "ACTIVE",
      type: "FESTGELD",
      maturityDate: { lte: now },
    },
    data: { status: "MATURED" },
  });

  return result.count;
}

// ─── Helpers ────────────────────────────────────────────────

function computeNextInterestDate(from: Date): Date {
  const next = new Date(from);
  next.setMonth(next.getMonth() + 1);
  next.setDate(1);
  next.setHours(2, 0, 0, 0); // Process at 2 AM on 1st of month
  return next;
}

function computeMaturityDate(start: Date, termMonths: number): Date {
  const maturity = new Date(start);
  maturity.setMonth(maturity.getMonth() + termMonths);
  return maturity;
}
