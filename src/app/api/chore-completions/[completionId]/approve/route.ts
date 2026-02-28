import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/auth-helpers";
import { approveChore } from "@/lib/services/chore.service";
import { safeErrorMessage } from "@/lib/api-error";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ completionId: string }> }
) {
  const { session, error } = await requireApiAuth();
  if (error) return error;

  const { completionId } = await params;
  try {
    const result = await approveChore(completionId, session.familyId);
    return NextResponse.json(result);
  } catch (e) {
    const message = safeErrorMessage(e);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
