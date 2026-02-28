import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/auth-helpers";
import { rejectWithdrawal } from "@/lib/services/investment.service";
import { safeErrorMessage } from "@/lib/api-error";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ investmentId: string }> }
) {
  const { session, error } = await requireApiAuth();
  if (error) return error;

  const { investmentId } = await params;

  try {
    await rejectWithdrawal(investmentId, session.familyId);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = safeErrorMessage(err);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
