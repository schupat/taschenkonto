import { prisma } from "@/lib/prisma";

export async function getSavingGoals(childId: string, familyId: string) {
  // Verify child belongs to family
  const child = await prisma.childAccount.findFirst({
    where: { id: childId, familyId },
  });
  if (!child) return [];

  return prisma.savingGoal.findMany({
    where: { childAccountId: childId },
    orderBy: { createdAt: "asc" },
  });
}

export async function createSavingGoal(
  childId: string,
  familyId: string,
  data: { title: string; targetCents: number; targetDate?: string }
) {
  // Verify child belongs to family
  const child = await prisma.childAccount.findFirst({
    where: { id: childId, familyId },
  });
  if (!child) throw new Error("Child not found");

  return prisma.savingGoal.create({
    data: {
      title: data.title,
      targetCents: data.targetCents,
      targetDate: data.targetDate ? new Date(data.targetDate) : null,
      childAccountId: childId,
    },
  });
}

export async function deleteSavingGoal(
  goalId: string,
  childId: string,
  familyId: string
) {
  // Verify child belongs to family
  const child = await prisma.childAccount.findFirst({
    where: { id: childId, familyId },
  });
  if (!child) throw new Error("Child not found");

  return prisma.savingGoal.delete({
    where: { id: goalId, childAccountId: childId },
  });
}
