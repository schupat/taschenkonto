import { NextRequest, NextResponse } from "next/server";
import { processAllowances } from "@/lib/services/allowance.service";
import { verifyCronAuth } from "@/lib/cron-auth";

export async function POST(req: NextRequest) {
  const authError = verifyCronAuth(req);
  if (authError) return authError;

  const processed = await processAllowances();
  return NextResponse.json({ processed });
}
