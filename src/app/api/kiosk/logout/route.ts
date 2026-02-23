import { NextResponse } from "next/server";
import { destroyKioskSession } from "@/lib/session";

export async function POST() {
  await destroyKioskSession();
  return NextResponse.json({ success: true });
}
