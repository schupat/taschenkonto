import { prisma } from "@/lib/prisma";
import type { ChoreRecurrence } from "@prisma/client";

export async function getChores(familyId: string) {
  return prisma.chore.findMany({
    where: { familyId },
    include: {
      assignments: {
        include: {
          childAccount: { select: { id: true, name: true, avatarEmoji: true } },
          completion: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function createChore(
  familyId: string,
  data: { title: string; description?: string; rewardCents: number; recurrence?: ChoreRecurrence }
) {
  return prisma.chore.create({
    data: {
      title: data.title,
      description: data.description,
      rewardCents: data.rewardCents,
      recurrence: data.recurrence || "ONE_TIME",
      familyId,
    },
  });
}

export async function updateChore(
  choreId: string,
  familyId: string,
  data: { title?: string; description?: string; rewardCents?: number }
) {
  return prisma.chore.update({
    where: { id: choreId, familyId },
    data,
  });
}

export async function deleteChore(choreId: string, familyId: string) {
  return prisma.chore.delete({ where: { id: choreId, familyId } });
}

export async function assignChore(
  choreId: string,
  childAccountIds: string[],
  familyId: string
) {
  // Verify chore belongs to family
  const chore = await prisma.chore.findFirst({ where: { id: choreId, familyId } });
  if (!chore) throw new Error("Not found");

  // Verify all children belong to the same family
  const children = await prisma.childAccount.findMany({
    where: { id: { in: childAccountIds }, familyId },
    select: { id: true },
  });
  if (children.length !== childAccountIds.length) throw new Error("Not found");

  // Create assignments for all children in one transaction
  return prisma.$transaction(
    childAccountIds.map((childAccountId) =>
      prisma.choreAssignment.create({
        data: { choreId, childAccountId },
      })
    )
  );
}

export async function markChoreCompleted(
  assignmentId: string,
  childAccountId: string
) {
  const assignment = await prisma.choreAssignment.findFirst({
    where: { id: assignmentId, childAccountId },
    include: { completion: true },
  });
  if (!assignment) throw new Error("Assignment not found");

  // If previously rejected, reset to PENDING so child can retry
  if (assignment.completion && assignment.completion.status === "REJECTED") {
    return prisma.choreCompletion.update({
      where: { id: assignment.completion.id },
      data: { status: "PENDING", completedAt: new Date() },
    });
  }

  if (assignment.completion) throw new Error("Already completed");

  return prisma.choreCompletion.create({
    data: {
      assignmentId,
      status: "PENDING",
    },
  });
}

/**
 * Parent approves a chore completion.
 * Atomically sets APPROVED + creates CHORE_REWARD transaction.
 */
export async function approveChore(completionId: string, familyId: string) {
  const completion = await prisma.choreCompletion.findFirst({
    where: { id: completionId },
    include: {
      assignment: {
        include: {
          chore: true,
          childAccount: { select: { id: true, familyId: true } },
        },
      },
    },
  });

  if (!completion || completion.assignment.childAccount.familyId !== familyId) {
    throw new Error("Not found");
  }
  if (completion.status !== "PENDING") {
    throw new Error("Already processed");
  }

  const approveOp = prisma.choreCompletion.update({
    where: { id: completionId },
    data: { status: "APPROVED", approvedAt: new Date() },
  });
  const rewardOp = prisma.transaction.create({
    data: {
      amountCents: completion.assignment.chore.rewardCents,
      type: "CHORE_REWARD",
      origin: "CHORE_COMPLETION",
      description: completion.assignment.chore.title,
      childAccountId: completion.assignment.childAccount.id,
      choreCompletionId: completionId,
    },
  });

  // Auto-regenerate assignment for recurring chores
  if (completion.assignment.chore.recurrence !== "ONE_TIME") {
    const [updatedCompletion, transaction] = await prisma.$transaction([
      approveOp,
      rewardOp,
      prisma.choreAssignment.create({
        data: {
          choreId: completion.assignment.chore.id,
          childAccountId: completion.assignment.childAccount.id,
        },
      }),
    ]);
    return { completion: updatedCompletion, transaction };
  }

  const [updatedCompletion, transaction] = await prisma.$transaction([approveOp, rewardOp]);

  return { completion: updatedCompletion, transaction };
}

export async function rejectChore(completionId: string, familyId: string) {
  const completion = await prisma.choreCompletion.findFirst({
    where: { id: completionId },
    include: {
      assignment: {
        include: {
          childAccount: { select: { familyId: true } },
        },
      },
    },
  });

  if (!completion || completion.assignment.childAccount.familyId !== familyId) {
    throw new Error("Not found");
  }
  if (completion.status !== "PENDING") {
    throw new Error("Already processed");
  }

  return prisma.choreCompletion.update({
    where: { id: completionId },
    data: { status: "REJECTED" },
  });
}

export async function getPendingApprovals(familyId: string) {
  return prisma.choreCompletion.findMany({
    where: {
      status: "PENDING",
      assignment: {
        childAccount: { familyId },
      },
    },
    include: {
      assignment: {
        include: {
          chore: { select: { title: true, rewardCents: true } },
          childAccount: { select: { name: true, avatarEmoji: true } },
        },
      },
    },
    orderBy: { completedAt: "desc" },
  });
}
