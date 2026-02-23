import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  updateAllowanceRule,
  deleteAllowanceRule,
} from "@/lib/services/allowance.service";
import { updateAllowanceRuleSchema } from "@/lib/validations/allowance";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ childId: string; ruleId: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { ruleId } = await params;
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = updateAllowanceRuleSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  try {
    const rule = await updateAllowanceRule(ruleId, session.familyId, parsed.data);
    return NextResponse.json(rule);
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ childId: string; ruleId: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { ruleId } = await params;
  try {
    await deleteAllowanceRule(ruleId, session.familyId);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
