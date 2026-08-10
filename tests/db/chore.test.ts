import { describe, it, beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import { prisma, resetDb, makeFamily, makeChild, saldoOf } from "./helpers";
import {
  createChore,
  assignChore,
  markChoreCompleted,
  approveChore,
  rejectChore,
} from "@/lib/services/chore.service";

describe("chore service", () => {
  let familyId: string;
  let childId: string;

  beforeEach(async () => {
    await resetDb();
    const family = await makeFamily();
    familyId = family.id;
    childId = (await makeChild(familyId)).id;
  });

  after(async () => {
    await prisma.$disconnect();
  });

  /** chore → assignment → child marks it done → returns the pending completion id */
  async function pendingCompletion(
    rewardCents = 200,
    recurrence: "ONE_TIME" | "WEEKLY" = "ONE_TIME"
  ) {
    const chore = await createChore(familyId, {
      title: "Zimmer aufräumen",
      rewardCents,
      recurrence,
    });
    const [assignment] = await assignChore(chore.id, [childId], familyId);
    const completion = await markChoreCompleted(assignment.id, childId);
    return { chore, assignment, completionId: completion.id };
  }

  function rewardCount() {
    return prisma.transaction.count({
      where: { childAccountId: childId, type: "CHORE_REWARD" },
    });
  }

  it("credits the reward when a parent approves", async () => {
    const { completionId } = await pendingCompletion(200);

    const { completion, transaction } = await approveChore(completionId, familyId);

    assert.equal(completion.status, "APPROVED");
    assert.ok(completion.approvedAt);
    assert.equal(transaction.amountCents, 200);
    assert.equal(await saldoOf(childId), 200);
  });

  it("pays nothing before approval", async () => {
    await pendingCompletion(200);
    assert.equal(await saldoOf(childId), 0);
  });

  it("pays nothing when the parent rejects", async () => {
    const { completionId } = await pendingCompletion(200);

    const rejected = await rejectChore(completionId, familyId);

    assert.equal(rejected.status, "REJECTED");
    assert.equal(await saldoOf(childId), 0);
  });

  it("rejects approving the same completion twice", async () => {
    const { completionId } = await pendingCompletion(200);
    await approveChore(completionId, familyId);

    await assert.rejects(
      () => approveChore(completionId, familyId),
      /Already processed/
    );
    assert.equal(await rewardCount(), 1);
    assert.equal(await saldoOf(childId), 200);
  });

  // Holds because Transaction.choreCompletionId is @unique and the reward is
  // created inside the same $transaction as the status change: the losing
  // approval rolls back both. Do not drop that constraint.
  it("pays only once when the approve button is double-clicked", async () => {
    const { completionId } = await pendingCompletion(200);

    await Promise.allSettled([
      approveChore(completionId, familyId),
      approveChore(completionId, familyId),
    ]);

    assert.equal(await rewardCount(), 1, "a chore must never be paid twice");
    assert.equal(await saldoOf(childId), 200);
  });

  it("cannot be approved after it was rejected", async () => {
    const { completionId } = await pendingCompletion(200);
    await rejectChore(completionId, familyId);

    await assert.rejects(
      () => approveChore(completionId, familyId),
      /Already processed/
    );
    assert.equal(await saldoOf(childId), 0);
  });

  it("lets a child retry a rejected chore, and pays once it is approved", async () => {
    const { assignment, completionId } = await pendingCompletion(200);
    await rejectChore(completionId, familyId);

    const retried = await markChoreCompleted(assignment.id, childId);
    assert.equal(retried.status, "PENDING");

    await approveChore(retried.id, familyId);
    assert.equal(await saldoOf(childId), 200);
    assert.equal(await rewardCount(), 1);
  });

  it("regenerates the assignment for a recurring chore", async () => {
    const { chore, completionId } = await pendingCompletion(200, "WEEKLY");

    await approveChore(completionId, familyId);

    const open = await prisma.choreAssignment.count({
      where: { choreId: chore.id, completion: null },
    });
    assert.equal(open, 1, "a fresh assignment must be waiting");
  });

  it("does not regenerate a one-time chore", async () => {
    const { chore, completionId } = await pendingCompletion(200, "ONE_TIME");

    await approveChore(completionId, familyId);

    const open = await prisma.choreAssignment.count({
      where: { choreId: chore.id, completion: null },
    });
    assert.equal(open, 0);
  });

  it("refuses approval from another family", async () => {
    const { completionId } = await pendingCompletion(200);
    const otherFamily = await makeFamily("Fremde Familie");

    await assert.rejects(
      () => approveChore(completionId, otherFamily.id),
      /Not found/
    );
    assert.equal(await saldoOf(childId), 0);
  });

  it("refuses to assign a chore to a child of another family", async () => {
    const otherFamily = await makeFamily("Fremde Familie");
    const otherChild = await makeChild(otherFamily.id);
    const chore = await createChore(familyId, {
      title: "Fremdzuweisung",
      rewardCents: 100,
    });

    await assert.rejects(
      () => assignChore(chore.id, [otherChild.id], familyId),
      /Not found/
    );
  });

  it("refuses to let a child complete someone else's assignment", async () => {
    const sibling = await makeChild(familyId, { name: "Geschwister" });
    const chore = await createChore(familyId, { title: "Spülen", rewardCents: 100 });
    const [assignment] = await assignChore(chore.id, [childId], familyId);

    await assert.rejects(
      () => markChoreCompleted(assignment.id, sibling.id),
      /Assignment not found/
    );
  });
});
