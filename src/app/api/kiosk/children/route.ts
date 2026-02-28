import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, recordFailedAttempt } from "@/lib/rate-limit";

// VULN-03 fix: Rate-limit this endpoint to prevent familyId enumeration.
// While the endpoint must remain accessible without login (it's the child-select
// screen before PIN entry), we mitigate enumeration with per-IP rate limiting.
export async function GET(req: NextRequest) {
  const familyId = req.nextUrl.searchParams.get("family");
  if (!familyId || familyId.length < 10 || familyId.length > 50) {
    return NextResponse.json({ error: "Missing family parameter" }, { status: 400 });
  }

  // Rate limit per IP to prevent enumeration
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rateKey = `kiosk-children:${ip}`;
  const { allowed } = await checkRateLimit(rateKey);
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  // Verify family exists
  const family = await prisma.family.findUnique({
    where: { id: familyId },
    select: { id: true },
  });
  if (!family) {
    await recordFailedAttempt(rateKey);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const children = await prisma.childAccount.findMany({
    where: { familyId },
    select: {
      id: true,
      name: true,
      avatarEmoji: true,
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(children);
}
