import { prisma } from "@/lib/prisma";
import type { AllowanceFrequency } from "@prisma/client";

const ALLOWANCE_RUN_HOUR = 8;

function atAllowanceRunTime(date: Date): Date {
  const scheduled = new Date(date);
  scheduled.setHours(ALLOWANCE_RUN_HOUR, 0, 0, 0);
  return scheduled;
}

function getMonthlyScheduledDate(
  year: number,
  month: number,
  dayOfMonth: number
): Date {
  const scheduled = new Date(year, month, 1);
  scheduled.setDate(Math.min(dayOfMonth, daysInMonth(scheduled)));
  return atAllowanceRunTime(scheduled);
}

function getScheduleDay(
  frequency: AllowanceFrequency,
  dayOfWeek?: number | null,
  dayOfMonth?: number | null
): number {
  if (frequency === "WEEKLY") {
    if (dayOfWeek === undefined || dayOfWeek === null) {
      throw new Error("Weekly allowance rules require dayOfWeek");
    }
    return dayOfWeek;
  }

  if (dayOfMonth === undefined || dayOfMonth === null) {
    throw new Error("Monthly allowance rules require dayOfMonth");
  }
  return dayOfMonth;
}

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
  data: {
    amountCents?: number;
    isActive?: boolean;
    frequency?: "WEEKLY" | "MONTHLY";
    dayOfWeek?: number | null;
    dayOfMonth?: number | null;
  }
) {
  const rule = await prisma.allowanceRule.findFirst({
    where: { id: ruleId },
    include: { childAccount: { select: { familyId: true } } },
  });
  if (!rule || rule.childAccount.familyId !== familyId) {
    throw new Error("Rule not found");
  }

  const nextFrequency = data.frequency ?? rule.frequency;
  const nextDayOfWeek =
    Object.prototype.hasOwnProperty.call(data, "dayOfWeek") ? data.dayOfWeek : rule.dayOfWeek;
  const nextDayOfMonth =
    Object.prototype.hasOwnProperty.call(data, "dayOfMonth") ? data.dayOfMonth : rule.dayOfMonth;

  const shouldRecalculateSchedule =
    data.frequency !== undefined ||
    Object.prototype.hasOwnProperty.call(data, "dayOfWeek") ||
    Object.prototype.hasOwnProperty.call(data, "dayOfMonth") ||
    data.isActive === true;

  const updateData: {
    amountCents?: number;
    isActive?: boolean;
    frequency?: "WEEKLY" | "MONTHLY";
    dayOfWeek?: number | null;
    dayOfMonth?: number | null;
    nextRunAt?: Date;
  } = { ...data };

  if (shouldRecalculateSchedule) {
    updateData.nextRunAt = computeNextRunAt(
      nextFrequency,
      new Date(),
      nextDayOfWeek,
      nextDayOfMonth
    );
  }

  return prisma.allowanceRule.update({
    where: { id: ruleId },
    data: updateData,
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
    select: { id: true },
  });

  let processed = 0;

  for (const rule of dueRules) {
    await prisma.$transaction(async (tx) => {
      const currentRule = await tx.allowanceRule.findUnique({
        where: { id: rule.id },
        select: {
          id: true,
          amountCents: true,
          frequency: true,
          dayOfWeek: true,
          dayOfMonth: true,
          nextRunAt: true,
          childAccountId: true,
          isActive: true,
        },
      });
      if (!currentRule || !currentRule.isActive || currentRule.nextRunAt > now) return;

      const { dueRunDates, nextRunAt } = collectDueRunDates(
        currentRule.frequency,
        currentRule.nextRunAt,
        now,
        currentRule.dayOfWeek,
        currentRule.dayOfMonth
      );
      if (dueRunDates.length === 0) return;

      const claimed = await tx.allowanceRule.updateMany({
        where: { id: currentRule.id, nextRunAt: currentRule.nextRunAt, isActive: true },
        data: {
          lastRunAt: dueRunDates[dueRunDates.length - 1],
          nextRunAt,
        },
      });
      if (claimed.count === 0) return;

      for (const runAt of dueRunDates) {
        await tx.transaction.create({
          data: {
            amountCents: currentRule.amountCents,
            type: "ALLOWANCE",
            origin: "ALLOWANCE_RULE",
            description: `Taschengeld (${currentRule.frequency === "WEEKLY" ? "wöchentlich" : "monatlich"})`,
            childAccountId: currentRule.childAccountId,
            createdAt: runAt,
          },
        });
      }

      processed += dueRunDates.length;
    });
  }

  return processed;
}

export function computeNextRunAt(
  frequency: AllowanceFrequency,
  from: Date,
  dayOfWeek?: number | null,
  dayOfMonth?: number | null
): Date {
  if (frequency === "WEEKLY") {
    const targetDay = getScheduleDay(frequency, dayOfWeek, dayOfMonth);
    const next = new Date(from);
    const dayOffset = (targetDay - next.getDay() + 7) % 7;

    next.setDate(next.getDate() + dayOffset);
    const scheduled = atAllowanceRunTime(next);
    if (scheduled <= from) {
      scheduled.setDate(scheduled.getDate() + 7);
    }
    return scheduled;
  }

  const targetDay = getScheduleDay(frequency, dayOfWeek, dayOfMonth);
  const scheduledThisMonth = getMonthlyScheduledDate(
    from.getFullYear(),
    from.getMonth(),
    targetDay
  );
  if (scheduledThisMonth > from) {
    return scheduledThisMonth;
  }

  return getMonthlyScheduledDate(from.getFullYear(), from.getMonth() + 1, targetDay);
}

export function collectDueRunDates(
  frequency: AllowanceFrequency,
  nextRunAt: Date,
  now: Date,
  dayOfWeek?: number | null,
  dayOfMonth?: number | null
): { dueRunDates: Date[]; nextRunAt: Date } {
  const dueRunDates: Date[] = [];
  let scheduledRun = new Date(nextRunAt);

  while (scheduledRun <= now) {
    dueRunDates.push(new Date(scheduledRun));
    scheduledRun = computeNextRunAt(frequency, scheduledRun, dayOfWeek, dayOfMonth);
  }

  return { dueRunDates, nextRunAt: scheduledRun };
}

function daysInMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}
