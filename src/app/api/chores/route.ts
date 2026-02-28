import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/auth-helpers";
import { getChores, createChore } from "@/lib/services/chore.service";
import { createChoreSchema } from "@/lib/validations/chore";

export async function GET() {
  const { session, error } = await requireApiAuth();
  if (error) return error;

  const chores = await getChores(session.familyId);
  return NextResponse.json(chores);
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireApiAuth();
  if (error) return error;

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = createChoreSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", issues: parsed.error.issues }, { status: 400 });
  }

  const chore = await createChore(session.familyId, parsed.data);
  return NextResponse.json(chore, { status: 201 });
}
