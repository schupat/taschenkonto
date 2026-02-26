import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { assignChore } from "@/lib/services/chore.service";
import { assignChoreSchema } from "@/lib/validations/chore";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ choreId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { choreId } = await params;
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = assignChoreSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }

  try {
    const assignments = await assignChore(choreId, parsed.data.childAccountIds, session.familyId);
    return NextResponse.json(assignments, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
