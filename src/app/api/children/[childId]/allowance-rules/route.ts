import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/auth-helpers";
import {
  getAllowanceRules,
  createAllowanceRule,
} from "@/lib/services/allowance.service";
import { createAllowanceRuleSchema } from "@/lib/validations/allowance";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ childId: string }> }
) {
  const { session, error } = await requireApiAuth();
  if (error) return error;

  const { childId } = await params;
  const rules = await getAllowanceRules(childId, session.familyId);
  return NextResponse.json(rules);
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
  const parsed = createAllowanceRuleSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  try {
    const rule = await createAllowanceRule(childId, session.familyId, parsed.data);
    return NextResponse.json(rule, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
