import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/auth-helpers";
import { changeChildPin } from "@/lib/services/child-account.service";
import { changePinSchema } from "@/lib/validations/child-account";

export async function PUT(
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

  const parsed = changePinSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  try {
    await changeChildPin(childId, session.familyId, parsed.data.pin);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
