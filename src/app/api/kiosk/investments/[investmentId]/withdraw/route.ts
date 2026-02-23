import { NextRequest, NextResponse } from "next/server";
import { getKioskSession } from "@/lib/session";
import { requestWithdrawal } from "@/lib/services/investment.service";
import { safeErrorMessage } from "@/lib/api-error";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ investmentId: string }> }
) {
  const session = await getKioskSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { investmentId } = await params;
  try {
    await requestWithdrawal(
      investmentId,
      session.childAccountId,
      session.familyId
    );
    return NextResponse.json({ status: "PENDING" });
  } catch (e) {
    const message = safeErrorMessage(e);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
