import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/auth-helpers";
import {
  getTransactions,
  createTransaction,
} from "@/lib/services/transaction.service";
import { createTransactionSchema } from "@/lib/validations/transaction";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ childId: string }> }
) {
  const { session, error } = await requireApiAuth();
  if (error) return error;

  const { childId } = await params;
  const searchParams = req.nextUrl.searchParams;
  const rawLimit = parseInt(searchParams.get("limit") || "50");
  const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(1, rawLimit), 200) : 50;
  const cursor = searchParams.get("cursor") || undefined;
  const VALID_TYPES = ["DEPOSIT", "WITHDRAWAL", "ADJUSTMENT", "ALLOWANCE", "CHORE_REWARD", "INVESTMENT_DEPOSIT", "INVESTMENT_WITHDRAWAL", "INTEREST"] as const;
  const rawType = searchParams.get("type");
  const type = rawType && (VALID_TYPES as readonly string[]).includes(rawType)
    ? (rawType as (typeof VALID_TYPES)[number])
    : undefined;

  const transactions = await getTransactions(childId, session.familyId, {
    limit,
    cursor,
    type: type || undefined,
  });

  return NextResponse.json(transactions);
}

export async function POST(
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
  const parsed = createTransactionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  try {
    const transaction = await createTransaction(
      childId,
      session.familyId,
      {
        ...parsed.data,
        createdByUserId: session.user.id,
      }
    );
    return NextResponse.json(transaction, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
