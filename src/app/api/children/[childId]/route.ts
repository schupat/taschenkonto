import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getChildWithSaldo,
  updateChildAccount,
  deleteChildAccount,
} from "@/lib/services/child-account.service";
import { updateChildSchema } from "@/lib/validations/child-account";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ childId: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { childId } = await params;
  const child = await getChildWithSaldo(childId, session.familyId);
  if (!child) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(child);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ childId: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { childId } = await params;
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = updateChildSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  try {
    const child = await updateChildAccount(childId, session.familyId, parsed.data);
    return NextResponse.json(child);
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ childId: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { childId } = await params;
  try {
    await deleteChildAccount(childId, session.familyId);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
