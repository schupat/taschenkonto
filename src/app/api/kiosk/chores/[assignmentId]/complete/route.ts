import { NextRequest, NextResponse } from "next/server";
import { getKioskSession } from "@/lib/session";
import { markChoreCompleted } from "@/lib/services/chore.service";
import { safeErrorMessage } from "@/lib/api-error";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ assignmentId: string }> }
) {
  const session = await getKioskSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { assignmentId } = await params;

  try {
    const completion = await markChoreCompleted(
      assignmentId,
      session.childAccountId
    );
    return NextResponse.json(completion, { status: 201 });
  } catch (e) {
    const message = safeErrorMessage(e);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
