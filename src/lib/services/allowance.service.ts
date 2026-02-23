import { prisma } from "@/lib/prisma";
import type { AllowanceFrequency } from "@prisma/client";

export async function getAllowanceRules(
  childAccountId: string,
  familyId: string
) {
  const child = await prisma.childAccount.findFirst({
    where: { id: childAccountId, familyId },
    select: { id: true },
  });
  if (!child) return [];

  return prisma.allowanceRule.findMany({
    where: { childAccountId },
    orderBy: { createdAt: "desc" },
  });
}

export async function createAllowanceRule(
  childAccountId: string,
  familyId: string,
  data: {
    amountCents: number;
    frequency: "WEEKLY" | "MONTHLY";
    dayOfWeek?: number;
    dayOfMonth?: number;
  }
) {
  const child = await prisma.childAccount.findFirst({
    where: { id: childAccountId, familyId },
    select: { id: true },
  });
  if (!child) throw new Error("Child not found");

  const nextRunAt = computeNextRunAt(data.frequency, new Date(), data.dayOfWeek, data.dayOfMonth);

  return prisma.allowanceRule.create({
    data: {
      amountCents: data.amountCents,
      frequency: data.frequency,
      dayOfWeek: data.dayOfWeek,
      dayOfMonth: data.dayOfMonth,
      nextRunAt,
      childAccountId,
    },
  });
}

export async function updateAllowanceRule(
  ruleId: string,
  familyId: string,
  data: { amountCents?: number; isActive?: boolean }
) {
  const rule = await prisma.allowanceRule.findFirst({
    where: { id: ruleId },
    include: { childAccount: { select: { familyId: true } } },
  });
  if (!rule || rule.childAccount.familyId !== familyId) {
    throw new Error("Rule not found");
  }

  return prisma.allowanceRule.update({
    where: { id: ruleId },
    data,
  });
}

export async function deleteAllowanceRule(ruleId: string, familyId: string) {
  const rule = await prisma.allowanceRule.findFirst({
    where: { id: ruleId },
    include: { childAccount: { select: { familyId: true } } },
  });
  if (!rule || rule.childAccount.familyId !== familyId) {
    throw new Error("Rule not found");
  }

  return prisma.allowanceRule.delete({ where: { id: ruleId } });
}

/**
 * Process all due allowance rules. Idempotent: advancing nextRunAt
 * in the same transaction as creating the payment prevents double-booking.
 */
export async function processAllowances() {
  const now = new Date();

  const dueRules = await prisma.allowanceRule.findMany({
    where: { isActive: true, nextRunAt: { lte: now } },
    include: { childAccount: true },
  });

  let processed = 0;

  for (const rule of dueRules) {
    const nextRunAt = computeNextRunAt(
      rule.frequency,
      now,
      rule.dayOfWeek,
      rule.dayOfMonth
    );

    // Fully atomic: claim + payment in one transaction.
    // Prevents lost payments if the process crashes between claim and transaction creation.
    let paid = false;
    await prisma.$transaction(async (tx) => {
      const claimed = await tx.allowanceRule.updateMany({
        where: { id: rule.id, nextRunAt: { lte: now } },
        data: { lastRunAt: now, nextRunAt },
      });
      if (claimed.count === 0) return; // Already processed by another instance

      await tx.transaction.create({
        data: {
          amountCents: rule.amountCents,
          type: "ALLOWANCE",
          origin: "ALLOWANCE_RULE",
          description: `Taschengeld (${rule.frequency === "WEEKLY" ? "wöchentlich" : "monatlich"})`,
          childAccountId: rule.childAccountId,
        },
      });
      paid = true;
    });

    if (paid) processed++;
  }

  return processed;
}

function computeNextRunAt(
  frequency: AllowanceFrequency,
  from: Date,
  dayOfWeek?: number | null,
  dayOfMonth?: number | null
): Date {
  const next = new Date(from);

  if (frequency === "WEEKLY") {
    next.setDate(next.getDate() + 7);
  } else {
    next.setMonth(next.getMonth() + 1);
    if (dayOfMonth) {
      next.setDate(Math.min(dayOfMonth, daysInMonth(next)));
    }
  }

  next.setHours(8, 0, 0, 0);
  return next;
}

function daysInMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}
