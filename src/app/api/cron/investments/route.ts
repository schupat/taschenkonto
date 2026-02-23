import { NextRequest, NextResponse } from "next/server";
import { processInvestments } from "@/lib/services/investment.service";
import { verifyCronAuth } from "@/lib/cron-auth";

export async function POST(req: NextRequest) {
  const authError = verifyCronAuth(req);
  if (authError) return authError;

  const result = await processInvestments();
  return NextResponse.json(result);
}
