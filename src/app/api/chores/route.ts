import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getChores, createChore } from "@/lib/services/chore.service";
import { createChoreSchema } from "@/lib/validations/chore";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const chores = await getChores(session.familyId);
  return NextResponse.json(chores);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
