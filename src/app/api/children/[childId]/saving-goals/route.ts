import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getSavingGoals,
  createSavingGoal,
} from "@/lib/services/saving-goal.service";
import { z } from "zod/v4";
import { safeErrorMessage } from "@/lib/api-error";

const createSchema = z.object({
  title: z.string().min(1).max(100),
  targetCents: z.number().int().min(1).max(100_000_00),
  targetDate: z.string().optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ childId: string }> }
) {
  const session = await auth();
  if (!session?.familyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { childId } = await params;
  const goals = await getSavingGoals(childId, session.familyId);
  return NextResponse.json(goals);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ childId: string }> }
) {
  const session = await auth();
  if (!session?.familyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { childId } = await params;
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = createSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  try {
    const goal = await createSavingGoal(
      childId,
      session.familyId,
      parsed.data
    );
    return NextResponse.json(goal, { status: 201 });
  } catch (e) {
    const message = safeErrorMessage(e);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
