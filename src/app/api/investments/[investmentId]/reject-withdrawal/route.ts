import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { rejectWithdrawal } from "@/lib/services/investment.service";
import { safeErrorMessage } from "@/lib/api-error";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ investmentId: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { investmentId } = await params;

  try {
    await rejectWithdrawal(investmentId, session.familyId);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = safeErrorMessage(err);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
