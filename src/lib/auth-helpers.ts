import { NextResponse } from "next/server";
import { auth } from "./auth";
import { redirect } from "next/navigation";

export async function requireAuth() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return session;
}

/**
 * Require authenticated session with a valid familyId for API routes.
 * Returns the session or a 401/403 NextResponse error.
 */
export async function requireApiAuth(): Promise<
  | { session: { user: { id: string }; familyId: string }; error?: never }
  | { session?: never; error: NextResponse }
> {
  const session = await auth();
  if (!session) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (!session.familyId) {
    return { error: NextResponse.json({ error: "No family associated" }, { status: 403 }) };
  }
  return { session: session as { user: { id: string }; familyId: string } };
}
