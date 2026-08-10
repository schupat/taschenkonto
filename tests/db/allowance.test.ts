import { describe, it, before, beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import { prisma, resetDb, makeFamily, makeChild, saldoOf } from "./helpers";
import { processAllowances } from "@/lib/services/allowance.service";

const DAY = 24 * 60 * 60 * 1000;

/** Mirrors ALLOWANCE_RUN_HOUR in allowance.service.ts. */
const RUN_HOUR = 8;

/**
 * A canonical run slot: 08:00 on yesterday's weekday, `weeksBack` weeks earlier.
 *
 * Slots must be built this way rather than as "now minus an hour". A stored
 * nextRunAt is always produced by computeNextRunAt and therefore always lands
 * exactly on 08:00; an arbitrary timestamp makes the number of due runs depend
 * on the wall clock, and the test flips once the machine's local time passes
 * 08:00. Anchoring on yesterday keeps the next slot six days out, whatever
 * time the suite runs at.
 */
function dueSlot(weeksBack = 0): Date {
  const slot = new Date();
  slot.setDate(slot.getDate() - 1 - 7 * weeksBack);
  slot.setHours(RUN_HOUR, 0, 0, 0);
  return slot;
}

async function makeWeeklyRule(
  childAccountId: string,
  nextRunAt: Date,
  amountCents = 500
) {
  return prisma.allowanceRule.create({
    data: {
      amountCents,
      frequency: "WEEKLY",
      dayOfWeek: nextRunAt.getDay(),
      nextRunAt,
      isActive: true,
      childAccountId,
    },
  });
}

function allowanceCount(childAccountId: string) {
  return prisma.transaction.count({
    where: { childAccountId, type: "ALLOWANCE" },
  });
}

describe("processAllowances", () => {
  let childId: string;

  before(async () => {
    await resetDb();
  });

  beforeEach(async () => {
    await resetDb();
    const family = await makeFamily();
    childId = (await makeChild(family.id)).id;
  });

  after(async () => {
    await prisma.$disconnect();
  });

  it("books a due rule exactly once", async () => {
    await makeWeeklyRule(childId, dueSlot());

    const processed = await processAllowances();

    assert.equal(processed, 1);
    assert.equal(await allowanceCount(childId), 1);
    assert.equal(await saldoOf(childId), 500);
  });

  it("does not double-book when the cron runs twice in a row", async () => {
    await makeWeeklyRule(childId, dueSlot());

    await processAllowances();
    const second = await processAllowances();

    assert.equal(second, 0, "second run must find nothing due");
    assert.equal(await allowanceCount(childId), 1);
    assert.equal(await saldoOf(childId), 500);
  });

  it("does not double-book when two cron runs overlap", async () => {
    // The realistic failure: a hung run and its retry, or two containers.
    await makeWeeklyRule(childId, dueSlot());

    await Promise.all([
      processAllowances(),
      processAllowances(),
      processAllowances(),
    ]);

    assert.equal(await allowanceCount(childId), 1);
    assert.equal(await saldoOf(childId), 500);
  });

  it("advances nextRunAt into the future so the rule is not immediately due again", async () => {
    const rule = await makeWeeklyRule(childId, dueSlot());

    await processAllowances();

    const after = await prisma.allowanceRule.findUniqueOrThrow({
      where: { id: rule.id },
    });
    assert.ok(
      after.nextRunAt > new Date(),
      `nextRunAt must be in the future, was ${after.nextRunAt.toISOString()}`
    );
    assert.ok(after.lastRunAt, "lastRunAt must be recorded");
  });

  it("backfills every missed period after downtime", async () => {
    // Three weeks of missed runs — e.g. the server was off.
    await makeWeeklyRule(childId, dueSlot(3));

    const processed = await processAllowances();

    assert.equal(processed, 4, "3 weeks late = the due run plus 3 catch-ups");
    assert.equal(await allowanceCount(childId), 4);
    assert.equal(await saldoOf(childId), 2000);
  });

  it("backfills at most once even if the catch-up run is interrupted and retried", async () => {
    await makeWeeklyRule(childId, dueSlot(3));

    await Promise.all([processAllowances(), processAllowances()]);

    assert.equal(await allowanceCount(childId), 4);
    assert.equal(await saldoOf(childId), 2000);
  });

  it("skips inactive rules", async () => {
    const rule = await makeWeeklyRule(childId, dueSlot());
    await prisma.allowanceRule.update({
      where: { id: rule.id },
      data: { isActive: false },
    });

    assert.equal(await processAllowances(), 0);
    assert.equal(await allowanceCount(childId), 0);
  });

  it("leaves rules that are not due yet alone", async () => {
    await makeWeeklyRule(childId, new Date(Date.now() + DAY));

    assert.equal(await processAllowances(), 0);
    assert.equal(await allowanceCount(childId), 0);
  });

  it("books each child's own rule independently", async () => {
    const otherFamily = await makeFamily("Andere Familie");
    const otherChild = await makeChild(otherFamily.id);
    await makeWeeklyRule(childId, dueSlot(), 500);
    await makeWeeklyRule(otherChild.id, dueSlot(), 300);

    await processAllowances();

    assert.equal(await saldoOf(childId), 500);
    assert.equal(await saldoOf(otherChild.id), 300);
  });
});
