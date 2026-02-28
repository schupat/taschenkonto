import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/auth-helpers";
import {
  getInvestment,
  withdrawInvestment,
} from "@/lib/services/investment.service";
import { safeErrorMessage } from "@/lib/api-error";

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

  return NextResponse.json(investment);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ childId: string; investmentId: string }> }
) {
  const { session, error } = await requireApiAuth();
  if (error) return error;

  const { childId, investmentId } = await params;
  try {
    const result = await withdrawInvestment(
      investmentId,
      childId,
      session.familyId
    );
    return NextResponse.json(result);
  } catch (e) {
    const message = safeErrorMessage(e);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
