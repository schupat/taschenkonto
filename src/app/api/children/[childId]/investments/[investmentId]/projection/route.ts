import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getInvestment,
  getInvestmentProjection,
} from "@/lib/services/investment.service";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ childId: string; investmentId: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { childId, investmentId } = await params;
  const investment = await getInvestment(
    investmentId,
    childId,
    session.familyId
  );
  if (!investment) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const months = investment.termMonths || 12;
  const projection = getInvestmentProjection(
    investment.principalCents,
    investment.interestRateBps,
    months
  );

  return NextResponse.json({ investment, projection });
}
