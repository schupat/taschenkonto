import { describe, it, beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import { prisma, resetDb, makeFamily, makeChild, credit, saldoOf } from "./helpers";
import {
  createInvestment,
  topUpInvestment,
  withdrawInvestment,
  requestWithdrawal,
  approveWithdrawal,
  rejectWithdrawal,
  processInvestments,
} from "@/lib/services/investment.service";

const HOUR = 60 * 60 * 1000;

describe("investment service", () => {
  let familyId: string;
  let childId: string;
  let userId: string;

  beforeEach(async () => {
    await resetDb();
    const family = await makeFamily();
    familyId = family.id;
    childId = (await makeChild(familyId)).id;
    userId = (
      await prisma.user.create({
        data: { email: "eltern@example.de", name: "Eltern", familyId },
      })
    ).id;
  });

  after(async () => {
    await prisma.$disconnect();
  });

  /** Makes the investment due for interest right now. */
  async function makeDue(investmentId: string) {
    await prisma.investment.update({
      where: { id: investmentId },
      data: { nextInterestAt: new Date(Date.now() - HOUR) },
    });
  }

  describe("createInvestment", () => {
    it("moves money out of the liquid saldo", async () => {
      await credit(childId, 10_000);

      const inv = await createInvestment(childId, familyId, {
        type: "TAGESGELD",
        amountCents: 4_000,
        interestRateBps: 1200,
      });

      assert.equal(inv.currentBalanceCents, 4_000);
      assert.equal(await saldoOf(childId), 6_000);
    });

    it("refuses to invest more than the child has", async () => {
      await credit(childId, 1_000);

      await assert.rejects(
        () =>
          createInvestment(childId, familyId, {
            type: "TAGESGELD",
            amountCents: 5_000,
            interestRateBps: 1200,
          }),
        /Insufficient balance/
      );
      assert.equal(await saldoOf(childId), 1_000);
    });

    it("cannot be overdrawn by investments started at the same moment", async () => {
      // A child hammering the "Anlegen" button in the kiosk.
      await credit(childId, 1_000);

      const results = await Promise.allSettled(
        Array.from({ length: 5 }, () =>
          createInvestment(childId, familyId, {
            type: "TAGESGELD",
            amountCents: 1_000,
            interestRateBps: 1200,
          })
        )
      );

      assert.equal(
        results.filter((r) => r.status === "fulfilled").length,
        1,
        "only one investment is affordable"
      );
      assert.equal(await saldoOf(childId), 0);
    });

    it("refuses to invest for a child of another family", async () => {
      const otherFamily = await makeFamily("Fremde Familie");
      const otherChild = await makeChild(otherFamily.id);
      await credit(otherChild.id, 10_000);

      await assert.rejects(
        () =>
          createInvestment(otherChild.id, familyId, {
            type: "TAGESGELD",
            amountCents: 1_000,
            interestRateBps: 1200,
          }),
        /Child not found/
      );
    });
  });

  describe("topUpInvestment", () => {
    it("refuses a top-up the child cannot afford", async () => {
      await credit(childId, 5_000);
      const inv = await createInvestment(childId, familyId, {
        type: "TAGESGELD",
        amountCents: 4_000,
        interestRateBps: 1200,
      });

      await assert.rejects(
        () => topUpInvestment(inv.id, childId, familyId, 5_000),
        /Insufficient balance/
      );
      assert.equal(await saldoOf(childId), 1_000);
    });

    it("cannot be overdrawn by top-ups sent at the same moment", async () => {
      await credit(childId, 2_000);
      const inv = await createInvestment(childId, familyId, {
        type: "TAGESGELD",
        amountCents: 1_000,
        interestRateBps: 1200,
      });

      const results = await Promise.allSettled(
        Array.from({ length: 5 }, () =>
          topUpInvestment(inv.id, childId, familyId, 1_000)
        )
      );

      assert.equal(
        results.filter((r) => r.status === "fulfilled").length,
        1,
        "only one top-up is affordable"
      );
      assert.equal(await saldoOf(childId), 0);
    });

    it("refuses to top up Festgeld", async () => {
      await credit(childId, 10_000);
      const inv = await createInvestment(childId, familyId, {
        type: "FESTGELD",
        amountCents: 4_000,
        interestRateBps: 1200,
        termMonths: 6,
      });

      await assert.rejects(
        () => topUpInvestment(inv.id, childId, familyId, 1_000),
        /Only Tagesgeld/
      );
    });
  });

  describe("processInvestments (cron)", () => {
    it("credits monthly interest into the investment, not the liquid saldo", async () => {
      await credit(childId, 10_000);
      const inv = await createInvestment(childId, familyId, {
        type: "TAGESGELD",
        amountCents: 10_000,
        interestRateBps: 1200, // 12% p.a. → 1% per month
      });
      await makeDue(inv.id);

      await processInvestments();

      const after = await prisma.investment.findUniqueOrThrow({ where: { id: inv.id } });
      assert.equal(after.currentBalanceCents, 10_100);
      assert.equal(
        await saldoOf(childId),
        0,
        "interest must stay inside the investment until it is withdrawn"
      );
    });

    it("does not credit interest twice when the cron runs twice", async () => {
      await credit(childId, 10_000);
      const inv = await createInvestment(childId, familyId, {
        type: "TAGESGELD",
        amountCents: 10_000,
        interestRateBps: 1200,
      });
      await makeDue(inv.id);

      await processInvestments();
      await processInvestments();

      const after = await prisma.investment.findUniqueOrThrow({ where: { id: inv.id } });
      assert.equal(after.currentBalanceCents, 10_100);
      assert.equal(
        await prisma.transaction.count({ where: { investmentId: inv.id, type: "INTEREST" } }),
        1
      );
    });

    it("does not credit interest twice when two cron runs overlap", async () => {
      await credit(childId, 10_000);
      const inv = await createInvestment(childId, familyId, {
        type: "TAGESGELD",
        amountCents: 10_000,
        interestRateBps: 1200,
      });
      await makeDue(inv.id);

      await Promise.all([processInvestments(), processInvestments()]);

      const after = await prisma.investment.findUniqueOrThrow({ where: { id: inv.id } });
      assert.equal(after.currentBalanceCents, 10_100);
    });

    it("skips investments that are not due yet", async () => {
      await credit(childId, 10_000);
      const inv = await createInvestment(childId, familyId, {
        type: "TAGESGELD",
        amountCents: 10_000,
        interestRateBps: 1200,
      });

      await processInvestments();

      const after = await prisma.investment.findUniqueOrThrow({ where: { id: inv.id } });
      assert.equal(after.currentBalanceCents, 10_000);
    });

    it("matures Festgeld once its term is over", async () => {
      await credit(childId, 10_000);
      const inv = await createInvestment(childId, familyId, {
        type: "FESTGELD",
        amountCents: 10_000,
        interestRateBps: 1200,
        termMonths: 6,
      });
      await prisma.investment.update({
        where: { id: inv.id },
        data: { maturityDate: new Date(Date.now() - HOUR) },
      });

      const { matured } = await processInvestments();

      assert.equal(matured, 1);
      const after = await prisma.investment.findUniqueOrThrow({ where: { id: inv.id } });
      assert.equal(after.status, "MATURED");
    });
  });

  describe("withdrawal", () => {
    it("pays Tagesgeld back into the liquid saldo", async () => {
      await credit(childId, 10_000);
      const inv = await createInvestment(childId, familyId, {
        type: "TAGESGELD",
        amountCents: 4_000,
        interestRateBps: 1200,
      });

      const { withdrawnCents } = await withdrawInvestment(inv.id, childId, familyId);

      assert.equal(withdrawnCents, 4_000);
      assert.equal(await saldoOf(childId), 10_000);
    });

    it("refuses to pay out Festgeld before maturity", async () => {
      await credit(childId, 10_000);
      const inv = await createInvestment(childId, familyId, {
        type: "FESTGELD",
        amountCents: 4_000,
        interestRateBps: 1200,
        termMonths: 6,
      });

      await assert.rejects(
        () => withdrawInvestment(inv.id, childId, familyId),
        /not matured/i
      );
      assert.equal(await saldoOf(childId), 6_000);
    });

    it("pays out only once when the same withdrawal is submitted twice at once", async () => {
      await credit(childId, 10_000);
      const inv = await createInvestment(childId, familyId, {
        type: "TAGESGELD",
        amountCents: 4_000,
        interestRateBps: 1200,
      });

      await Promise.allSettled([
        withdrawInvestment(inv.id, childId, familyId),
        withdrawInvestment(inv.id, childId, familyId),
      ]);

      assert.equal(
        await saldoOf(childId),
        10_000,
        "the money may only come back once"
      );
    });

    it("refuses to pay out another family's investment", async () => {
      const otherFamily = await makeFamily("Fremde Familie");
      const otherChild = await makeChild(otherFamily.id);
      await credit(otherChild.id, 10_000);
      const foreign = await createInvestment(otherChild.id, otherFamily.id, {
        type: "TAGESGELD",
        amountCents: 4_000,
        interestRateBps: 1200,
      });

      await assert.rejects(
        () => withdrawInvestment(foreign.id, otherChild.id, familyId),
        /Investment not found/
      );
      assert.equal(await saldoOf(otherChild.id), 6_000);
    });
  });

  describe("parent-approved withdrawal", () => {
    it("pays out after the parent approves", async () => {
      await credit(childId, 10_000);
      const inv = await createInvestment(childId, familyId, {
        type: "TAGESGELD",
        amountCents: 4_000,
        interestRateBps: 1200,
      });

      await requestWithdrawal(inv.id, childId, familyId);
      const { withdrawnCents } = await approveWithdrawal(inv.id, familyId, userId);

      assert.equal(withdrawnCents, 4_000);
      assert.equal(await saldoOf(childId), 10_000);
    });

    it("pays nothing when the parent rejects", async () => {
      await credit(childId, 10_000);
      const inv = await createInvestment(childId, familyId, {
        type: "TAGESGELD",
        amountCents: 4_000,
        interestRateBps: 1200,
      });

      await requestWithdrawal(inv.id, childId, familyId);
      await rejectWithdrawal(inv.id, familyId);

      assert.equal(await saldoOf(childId), 6_000);
      await assert.rejects(
        () => approveWithdrawal(inv.id, familyId, userId),
        /No pending withdrawal/
      );
    });

    it("pays out only once when the parent double-clicks approve", async () => {
      await credit(childId, 10_000);
      const inv = await createInvestment(childId, familyId, {
        type: "TAGESGELD",
        amountCents: 4_000,
        interestRateBps: 1200,
      });
      await requestWithdrawal(inv.id, childId, familyId);

      await Promise.allSettled([
        approveWithdrawal(inv.id, familyId, userId),
        approveWithdrawal(inv.id, familyId, userId),
      ]);

      assert.equal(await saldoOf(childId), 10_000);
    });

    it("refuses approval from another family", async () => {
      await credit(childId, 10_000);
      const inv = await createInvestment(childId, familyId, {
        type: "TAGESGELD",
        amountCents: 4_000,
        interestRateBps: 1200,
      });
      await requestWithdrawal(inv.id, childId, familyId);
      const otherFamily = await makeFamily("Fremde Familie");

      await assert.rejects(
        () => approveWithdrawal(inv.id, otherFamily.id, userId),
        /No pending withdrawal/
      );
      assert.equal(await saldoOf(childId), 6_000);
    });
  });
});
