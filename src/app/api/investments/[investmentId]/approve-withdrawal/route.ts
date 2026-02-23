import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { approveWithdrawal } from "@/lib/services/investment.service";
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
    const result = await approveWithdrawal(
      investmentId,
      session.familyId,
      session.user.id
    );
    return NextResponse.json(result);
  } catch (err) {
    const message = safeErrorMessage(err);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
