import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function getChildrenWithSaldo(familyId: string) {
  const children = await prisma.childAccount.findMany({
    where: { familyId },
    include: {
      transactions: { select: { amountCents: true } },
      savingGoals: true,
      allowanceRules: { where: { isActive: true }, take: 1 },
    },
    orderBy: { createdAt: "asc" },
  });

  return children.map((child) => ({
    id: child.id,
    name: child.name,
    avatarEmoji: child.avatarEmoji,
    color: child.color,
    familyId: child.familyId,
    saldoCents: child.transactions.reduce((sum, t) => sum + t.amountCents, 0),
    savingGoals: child.savingGoals,
    hasAllowanceRule: child.allowanceRules.length > 0,
    createdAt: child.createdAt,
  }));
}

export async function getChildWithSaldo(childId: string, familyId: string) {
  const child = await prisma.childAccount.findFirst({
    where: { id: childId, familyId },
    include: {
      transactions: { select: { amountCents: true } },
      savingGoals: true,
    },
  });

  if (!child) return null;

  const { hashedPin, transactions, ...safeChild } = child;
  return {
    ...safeChild,
    saldoCents: transactions.reduce((sum, t) => sum + t.amountCents, 0),
  };
}

export async function createChildAccount(
  familyId: string,
  data: { name: string; pin: string; avatarEmoji?: string }
) {
  const hashedPin = await bcrypt.hash(data.pin, 10);
  return prisma.childAccount.create({
    data: {
      name: data.name,
      avatarEmoji: data.avatarEmoji || "🧒",
      hashedPin,
      familyId,
    },
    select: {
      id: true,
      name: true,
      avatarEmoji: true,
      color: true,
      familyId: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

export async function updateChildAccount(
  childId: string,
  familyId: string,
  data: { name?: string; avatarEmoji?: string; color?: string }
) {
  return prisma.childAccount.update({
    where: { id: childId, familyId },
    data,
    select: {
      id: true,
      name: true,
      avatarEmoji: true,
      color: true,
      familyId: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

export async function changeChildPin(
  childId: string,
  familyId: string,
  newPin: string
) {
  const hashedPin = await bcrypt.hash(newPin, 10);
  return prisma.childAccount.update({
    where: { id: childId, familyId },
    data: { hashedPin, pinChangedAt: new Date() },
  });
}

export async function deleteChildAccount(childId: string, familyId: string) {
  return prisma.childAccount.delete({
    where: { id: childId, familyId },
  });
}
