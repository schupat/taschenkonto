import { describe, it, before, beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import { prisma, resetDb, makeFamily, makeChild, saldoOf } from "./helpers";
import { processAllowances } from "@/lib/services/allowance.service";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

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
    await makeWeeklyRule(childId, new Date(Date.now() - HOUR));

    const processed = await processAllowances();

    assert.equal(processed, 1);
    assert.equal(await allowanceCount(childId), 1);
    assert.equal(await saldoOf(childId), 500);
  });

  it("does not double-book when the cron runs twice in a row", async () => {
    await makeWeeklyRule(childId, new Date(Date.now() - HOUR));

    await processAllowances();
    const second = await processAllowances();

    assert.equal(second, 0, "second run must find nothing due");
    assert.equal(await allowanceCount(childId), 1);
    assert.equal(await saldoOf(childId), 500);
  });

  it("does not double-book when two cron runs overlap", async () => {
    // The realistic failure: a hung run and its retry, or two containers.
    await makeWeeklyRule(childId, new Date(Date.now() - HOUR));

    await Promise.all([
      processAllowances(),
      processAllowances(),
      processAllowances(),
    ]);

    assert.equal(await allowanceCount(childId), 1);
    assert.equal(await saldoOf(childId), 500);
  });

  it("advances nextRunAt into the future so the rule is not immediately due again", async () => {
    const rule = await makeWeeklyRule(childId, new Date(Date.now() - HOUR));

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
    await makeWeeklyRule(childId, new Date(Date.now() - 21 * DAY - HOUR));

    const processed = await processAllowances();

    assert.equal(processed, 4, "3 weeks late = the due run plus 3 catch-ups");
    assert.equal(await allowanceCount(childId), 4);
    assert.equal(await saldoOf(childId), 2000);
  });

  it("backfills at most once even if the catch-up run is interrupted and retried", async () => {
    await makeWeeklyRule(childId, new Date(Date.now() - 21 * DAY - HOUR));

    await Promise.all([processAllowances(), processAllowances()]);

    assert.equal(await allowanceCount(childId), 4);
    assert.equal(await saldoOf(childId), 2000);
  });

  it("skips inactive rules", async () => {
    const rule = await makeWeeklyRule(childId, new Date(Date.now() - HOUR));
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
    await makeWeeklyRule(childId, new Date(Date.now() - HOUR), 500);
    await makeWeeklyRule(otherChild.id, new Date(Date.now() - HOUR), 300);

    await processAllowances();

    assert.equal(await saldoOf(childId), 500);
    assert.equal(await saldoOf(otherChild.id), 300);
  });
});
