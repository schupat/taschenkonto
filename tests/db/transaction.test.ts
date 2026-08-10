import { describe, it, beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import { prisma, resetDb, makeFamily, makeChild, credit, saldoOf } from "./helpers";
import {
  createTransaction,
  revertTransaction,
  getTransactions,
  getChildSaldo,
} from "@/lib/services/transaction.service";

describe("transaction service", () => {
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

  describe("createTransaction", () => {
    it("stores a withdrawal as a negative amount", async () => {
      const tx = await createTransaction(childId, familyId, {
        amountCents: 150,
        type: "WITHDRAWAL",
        description: "Eis",
      });

      assert.equal(tx.amountCents, -150);
    });

    it("normalises the sign instead of trusting the caller", async () => {
      // The UI sends a positive number and a type; the type decides the sign.
      const withdrawal = await createTransaction(childId, familyId, {
        amountCents: -150,
        type: "WITHDRAWAL",
        description: "Eis",
      });
      const deposit = await createTransaction(childId, familyId, {
        amountCents: -200,
        type: "DEPOSIT",
        description: "Oma",
      });

      assert.equal(withdrawal.amountCents, -150);
      assert.equal(deposit.amountCents, 200);
    });

    it("sums to a saldo, which is never stored", async () => {
      await createTransaction(childId, familyId, {
        amountCents: 1000,
        type: "DEPOSIT",
        description: "Start",
      });
      await createTransaction(childId, familyId, {
        amountCents: 150,
        type: "WITHDRAWAL",
        description: "Eis",
      });

      assert.equal(await getChildSaldo(childId), 850);
    });

    it("refuses to book onto a child of another family", async () => {
      const otherFamily = await makeFamily("Fremde Familie");
      const otherChild = await makeChild(otherFamily.id);

      await assert.rejects(
        () =>
          createTransaction(otherChild.id, familyId, {
            amountCents: 1000,
            type: "DEPOSIT",
            description: "Fremdbuchung",
          }),
        /Child not found/
      );
      assert.equal(await saldoOf(otherChild.id), 0);
    });
  });

  describe("revertTransaction", () => {
    it("creates an inverse entry that cancels the original out", async () => {
      const original = await createTransaction(childId, familyId, {
        amountCents: 500,
        type: "DEPOSIT",
        description: "Versehen",
      });

      const revert = await revertTransaction(original.id, childId, familyId, userId);

      assert.equal(revert.amountCents, -500);
      assert.equal(revert.revertedTransactionId, original.id);
      assert.equal(await getChildSaldo(childId), 0);
    });

    it("rejects reverting the same transaction twice", async () => {
      const original = await createTransaction(childId, familyId, {
        amountCents: 500,
        type: "DEPOSIT",
        description: "Versehen",
      });
      await revertTransaction(original.id, childId, familyId, userId);

      await assert.rejects(
        () => revertTransaction(original.id, childId, familyId, userId),
        /already reverted/i
      );
      assert.equal(await getChildSaldo(childId), 0);
    });

    it("rejects reverting a revert", async () => {
      const original = await createTransaction(childId, familyId, {
        amountCents: 500,
        type: "DEPOSIT",
        description: "Versehen",
      });
      const revert = await revertTransaction(original.id, childId, familyId, userId);

      await assert.rejects(
        () => revertTransaction(revert.id, childId, familyId, userId),
        /Cannot revert a revert/i
      );
    });

    it("keeps the saldo correct when the same revert is submitted twice at once", async () => {
      // Double-click on "Stornieren", or a retried request.
      const original = await createTransaction(childId, familyId, {
        amountCents: 500,
        type: "DEPOSIT",
        description: "Versehen",
      });

      const results = await Promise.allSettled([
        revertTransaction(original.id, childId, familyId, userId),
        revertTransaction(original.id, childId, familyId, userId),
      ]);

      assert.equal(
        results.filter((r) => r.status === "fulfilled").length,
        1,
        "exactly one revert may succeed"
      );
      assert.equal(await getChildSaldo(childId), 0);
    });

    it("refuses to revert a transaction of another family's child", async () => {
      const otherFamily = await makeFamily("Fremde Familie");
      const otherChild = await makeChild(otherFamily.id);
      const foreign = await credit(otherChild.id, 900);

      await assert.rejects(
        () => revertTransaction(foreign.id, otherChild.id, familyId, userId),
        /not found/i
      );
      assert.equal(await saldoOf(otherChild.id), 900);
    });
  });

  describe("getTransactions", () => {
    it("marks reverted originals so the UI can strike them through", async () => {
      const original = await createTransaction(childId, familyId, {
        amountCents: 500,
        type: "DEPOSIT",
        description: "Versehen",
      });
      await createTransaction(childId, familyId, {
        amountCents: 300,
        type: "DEPOSIT",
        description: "Bleibt",
      });
      await revertTransaction(original.id, childId, familyId, userId);

      const list = await getTransactions(childId, familyId);
      const byId = new Map(list.map((t) => [t.id, t]));

      assert.equal(byId.get(original.id)?.isReverted, true);
      assert.equal(
        list.filter((t) => t.description === "Bleibt")[0].isReverted,
        false
      );
    });

    it("returns nothing for a child of another family", async () => {
      const otherFamily = await makeFamily("Fremde Familie");
      const otherChild = await makeChild(otherFamily.id);
      await credit(otherChild.id, 900);

      assert.deepEqual(await getTransactions(otherChild.id, familyId), []);
    });
  });
});
