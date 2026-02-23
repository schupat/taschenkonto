import { NextRequest, NextResponse } from "next/server";
import { getKioskSession } from "@/lib/session";
import {
  getInvestments,
  createInvestment,
} from "@/lib/services/investment.service";
import { safeErrorMessage } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";
import { createInvestmentSchema } from "@/lib/validations/investment";

export async function GET() {
  const session = await getKioskSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const investments = await getInvestments(
    session.childAccountId,
    session.familyId
  );
  return NextResponse.json(
    investments.map((inv) => ({
      id: inv.id,
      type: inv.type,
      status: inv.status,
      principalCents: inv.principalCents,
      currentBalanceCents: inv.currentBalanceCents,
      interestRateBps: inv.interestRateBps,
      termMonths: inv.termMonths,
      startDate: inv.startDate.toISOString(),
      maturityDate: inv.maturityDate?.toISOString() ?? null,
    }))
  );
}

export async function POST(req: NextRequest) {
  const session = await getKioskSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if kiosk investments are enabled for this family
  const family = await prisma.family.findUnique({
    where: { id: session.familyId },
    select: { kioskInvestmentsEnabled: true },
  });
  if (!family?.kioskInvestmentsEnabled) {
    return NextResponse.json(
      { error: "Investments not enabled" },
      { status: 403 }
    );
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createInvestmentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed" },
      { status: 400 }
    );
  }

  // VULN-06 fix: Override client-provided interest rate with server defaults.
  // Children must not choose their own rate.
  const enforcedRate = parsed.data.type === "TAGESGELD" ? 300 : 500; // 3% / 5%
  const enforcedData = { ...parsed.data, interestRateBps: enforcedRate };

  try {
    const investment = await createInvestment(
      session.childAccountId,
      session.familyId,
      enforcedData
    );
    return NextResponse.json(investment, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: safeErrorMessage(e) }, { status: 400 });
  }
}
