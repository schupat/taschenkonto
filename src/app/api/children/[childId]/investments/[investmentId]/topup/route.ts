import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { topUpInvestment } from "@/lib/services/investment.service";
import { safeErrorMessage } from "@/lib/api-error";
import { z } from "zod/v4";

// VULN-13 fix: Zod validation for top-up amount
const topUpSchema = z.object({
  amountCents: z.number().int().positive().max(10_000_00), // Max 10,000 EUR
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ childId: string; investmentId: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { childId, investmentId } = await params;

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = topUpSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }

  try {
    const investment = await topUpInvestment(
      investmentId,
      childId,
      session.familyId,
      parsed.data.amountCents
    );
    return NextResponse.json(investment);
  } catch (err) {
    return NextResponse.json({ error: safeErrorMessage(err) }, { status: 400 });
  }
}
