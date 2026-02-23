import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { deleteSavingGoal } from "@/lib/services/saving-goal.service";
import { safeErrorMessage } from "@/lib/api-error";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ childId: string; goalId: string }> }
) {
  const session = await auth();
  if (!session?.familyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { childId, goalId } = await params;

  try {
    await deleteSavingGoal(goalId, childId, session.familyId);
    return NextResponse.json({ success: true });
  } catch (e) {
    const message = safeErrorMessage(e);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
