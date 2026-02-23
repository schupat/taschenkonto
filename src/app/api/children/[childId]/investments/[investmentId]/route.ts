import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getInvestment,
  withdrawInvestment,
} from "@/lib/services/investment.service";
import { safeErrorMessage } from "@/lib/api-error";

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

  return NextResponse.json(investment);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ childId: string; investmentId: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
