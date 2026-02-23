import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { rejectChore } from "@/lib/services/chore.service";
import { safeErrorMessage } from "@/lib/api-error";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ completionId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { completionId } = await params;
  try {
    const result = await rejectChore(completionId, session.familyId);
    return NextResponse.json(result);
  } catch (e) {
    const message = safeErrorMessage(e);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
