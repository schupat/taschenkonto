import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/auth-helpers";
import {
  getInvestment,
  getInvestmentProjection,
} from "@/lib/services/investment.service";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ childId: string; investmentId: string }> }
) {
  const { session, error } = await requireApiAuth();
  if (error) return error;

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
