import { NextResponse } from "next/server";
import { getKioskSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getKioskSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const child = await prisma.childAccount.findUnique({
    where: { id: session.childAccountId },
    include: {
      transactions: {
        orderBy: { createdAt: "desc" },
        take: 20,
      },
      savingGoals: true,
      choreAssignments: {
        where: {
          completion: null,
        },
        include: {
          chore: { select: { title: true, rewardCents: true } },
        },
      },
      investments: {
        where: {
          status: { not: "WITHDRAWN" },
        },
        orderBy: { createdAt: "desc" },
      },
      family: { select: { currency: true, kioskInvestmentsEnabled: true } },
    },
  });

  if (!child) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Accurate saldo from ALL transactions (not just the 20 recent ones for display)
  const allTransactions = await prisma.transaction.aggregate({
    where: { childAccountId: child.id },
    _sum: { amountCents: true },
  });

  return NextResponse.json({
    id: child.id,
    name: child.name,
    avatarEmoji: child.avatarEmoji,
    saldoCents: allTransactions._sum.amountCents ?? 0,
    currency: child.family.currency,
    recentTransactions: child.transactions.map((t) => ({
      id: t.id,
      amountCents: t.amountCents,
      type: t.type,
      description: t.description,
      createdAt: t.createdAt.toISOString(),
    })),
    savingGoals: child.savingGoals.map((g) => ({
      id: g.id,
      title: g.title,
      targetCents: g.targetCents,
    })),
    openChores: child.choreAssignments.map((a) => ({
      assignmentId: a.id,
      title: a.chore.title,
      rewardCents: a.chore.rewardCents,
    })),
    investments: child.investments.map((inv) => ({
      id: inv.id,
      type: inv.type,
      status: inv.status,
      principalCents: inv.principalCents,
      currentBalanceCents: inv.currentBalanceCents,
      interestRateBps: inv.interestRateBps,
      termMonths: inv.termMonths,
      maturityDate: inv.maturityDate?.toISOString() ?? null,
      withdrawalStatus: inv.withdrawalStatus ?? null,
    })),
    kioskInvestmentsEnabled: child.family.kioskInvestmentsEnabled,
  });
}
