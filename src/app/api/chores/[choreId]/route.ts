import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/auth-helpers";
import { updateChore, deleteChore } from "@/lib/services/chore.service";
import { updateChoreSchema } from "@/lib/validations/chore";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ choreId: string }> }
) {
  const { session, error } = await requireApiAuth();
  if (error) return error;

  const { choreId } = await params;
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = updateChoreSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }

  try {
    const chore = await updateChore(choreId, session.familyId, parsed.data);
    return NextResponse.json(chore);
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ choreId: string }> }
) {
  const { session, error } = await requireApiAuth();
  if (error) return error;

  const { choreId } = await params;
  try {
    await deleteChore(choreId, session.familyId);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
