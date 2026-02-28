import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/auth-helpers";
import { revertTransaction } from "@/lib/services/transaction.service";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ childId: string; transactionId: string }> }
) {
  const { session, error } = await requireApiAuth();
  if (error) return error;

  const { childId, transactionId } = await params;

  try {
    const tx = await revertTransaction(
      transactionId,
      childId,
      session.familyId,
      session.user.id
    );
    return NextResponse.json(tx, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    if (msg === "Transaction not found" || msg === "Child not found") {
      return NextResponse.json({ error: msg }, { status: 404 });
    }
    if (
      msg === "Transaction already reverted" ||
      msg === "Cannot revert a revert transaction"
    ) {
      return NextResponse.json({ error: msg }, { status: 409 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
