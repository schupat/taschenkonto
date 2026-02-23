import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getChildrenWithSaldo,
  createChildAccount,
} from "@/lib/services/child-account.service";
import { createChildSchema } from "@/lib/validations/child-account";

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const children = await getChildrenWithSaldo(session.familyId);
  return NextResponse.json(children);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = createChildSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const child = await createChildAccount(session.familyId, parsed.data);
  return NextResponse.json(child, { status: 201 });
}
