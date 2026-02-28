import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { z } from "zod/v4";

const updateFamilySettingsSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  currency: z.enum(["EUR", "CHF", "USD", "GBP"]).optional(),
  kioskInvestmentsEnabled: z.boolean().optional(),
});

export async function GET() {
  const { session, error } = await requireApiAuth();
  if (error) return error;

  const family = await prisma.family.findUnique({
    where: { id: session.familyId },
    select: {
      name: true,
      currency: true,
      kioskInvestmentsEnabled: true,
    },
  });

  return NextResponse.json(family);
}

export async function PATCH(req: NextRequest) {
  const { session, error } = await requireApiAuth();
  if (error) return error;

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = updateFamilySettingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const family = await prisma.family.update({
    where: { id: session.familyId },
    data: parsed.data,
  });

  return NextResponse.json({
    name: family.name,
    currency: family.currency,
    kioskInvestmentsEnabled: family.kioskInvestmentsEnabled,
  });
}
