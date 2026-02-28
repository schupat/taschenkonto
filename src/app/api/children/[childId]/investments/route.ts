import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/auth-helpers";
import {
  getInvestments,
  createInvestment,
} from "@/lib/services/investment.service";
import { createInvestmentSchema } from "@/lib/validations/investment";
import { safeErrorMessage } from "@/lib/api-error";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ childId: string }> }
) {
  const { session, error } = await requireApiAuth();
  if (error) return error;

  const { childId } = await params;
  const investments = await getInvestments(childId, session.familyId);
  return NextResponse.json(investments);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ childId: string }> }
) {
  const { session, error } = await requireApiAuth();
  if (error) return error;

  const { childId } = await params;
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = createInvestmentSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  try {
    const investment = await createInvestment(
      childId,
      session.familyId,
      parsed.data
    );
    return NextResponse.json(investment, { status: 201 });
  } catch (e) {
    const message = safeErrorMessage(e);
    const status = message === "Insufficient balance" ? 400 : 404;
    return NextResponse.json({ error: message }, { status });
  }
}
