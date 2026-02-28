import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/auth-helpers";
import { updateSavingGoal, deleteSavingGoal } from "@/lib/services/saving-goal.service";
import { safeErrorMessage } from "@/lib/api-error";
import { z } from "zod/v4";

const updateSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  targetCents: z.number().int().min(1).max(100_000_00).optional(),
  targetDate: z.string().nullable().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ childId: string; goalId: string }> }
) {
  const { session, error } = await requireApiAuth();
  if (error) return error;

  const { childId, goalId } = await params;
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }

  try {
    const goal = await updateSavingGoal(goalId, childId, session.familyId, parsed.data);
    return NextResponse.json(goal);
  } catch (e) {
    const message = safeErrorMessage(e);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ childId: string; goalId: string }> }
) {
  const { session, error } = await requireApiAuth();
  if (error) return error;

  const { childId, goalId } = await params;

  try {
    await deleteSavingGoal(goalId, childId, session.familyId);
    return NextResponse.json({ success: true });
  } catch (e) {
    const message = safeErrorMessage(e);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
