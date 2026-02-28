import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createKioskSession } from "@/lib/session";
import { checkRateLimit, recordFailedAttempt, clearRateLimit } from "@/lib/rate-limit";
import bcrypt from "bcryptjs";
import { z } from "zod/v4";

const loginSchema = z.object({
  childAccountId: z.string().min(1),
  pin: z.string().regex(/^\d{4,6}$/),
});

export async function POST(req: NextRequest) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  // VULN-04 fix: Rate limit PIN attempts per childAccountId
  const rateKey = `pin:${parsed.data.childAccountId}`;
  const { allowed, retryAfterMs } = await checkRateLimit(rateKey);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many attempts. Try again later." },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil((retryAfterMs || 0) / 1000)) },
      }
    );
  }

  const child = await prisma.childAccount.findUnique({
    where: { id: parsed.data.childAccountId },
  });

  if (!child) {
    // Don't reveal whether account exists — use same error for not-found and wrong-PIN
    await recordFailedAttempt(rateKey);
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const valid = await bcrypt.compare(parsed.data.pin, child.hashedPin);
  if (!valid) {
    await recordFailedAttempt(rateKey);
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  await clearRateLimit(rateKey);
  await createKioskSession(child.id, child.familyId);

  return NextResponse.json({ success: true, name: child.name });
}
