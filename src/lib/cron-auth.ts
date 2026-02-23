import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

/**
 * VULN-08 fix: Validate cron auth header with constant-time comparison.
 * Returns null if authorized, or an error response if not.
 */
export function verifyCronAuth(req: NextRequest): NextResponse | null {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "Cron not configured" }, { status: 503 });
  }

  const authHeader = req.headers.get("authorization") || "";
  const expected = `Bearer ${cronSecret}`;

  // Constant-time comparison to prevent timing attacks
  const expectedBuf = Buffer.from(expected, "utf8");
  const actualBuf = Buffer.from(authHeader, "utf8");

  if (
    expectedBuf.length !== actualBuf.length ||
    !crypto.timingSafeEqual(expectedBuf, actualBuf)
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null; // Authorized
}
