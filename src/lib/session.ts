import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

const COOKIE_NAME = "kiosk-session";

// VULN-01 fix: Fail loud if secret is missing in production.
// Lazy-initialized so the check runs at request time, not at build time.
function getSecret(): Uint8Array {
  const KIOSK_SECRET = process.env.KIOSK_SESSION_SECRET;
  if (!KIOSK_SECRET && process.env.NODE_ENV === "production") {
    throw new Error(
      "KIOSK_SESSION_SECRET is required in production. Generate with: openssl rand -base64 32"
    );
  }
  return new TextEncoder().encode(
    KIOSK_SECRET || "dev-only-insecure-key-do-not-use-in-prod"
  );
}

export async function createKioskSession(
  childAccountId: string,
  familyId: string
) {
  const token = await new SignJWT({ childAccountId, familyId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(getSecret());

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 8 * 60 * 60,
    path: "/",
  });
}

export async function getKioskSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecret());
    const session = payload as { childAccountId: string; familyId: string; iat?: number };

    // Reject tokens issued before the most recent PIN change
    if (session.iat) {
      const child = await prisma.childAccount.findUnique({
        where: { id: session.childAccountId },
        select: { pinChangedAt: true },
      });
      if (child?.pinChangedAt && session.iat < Math.floor(child.pinChangedAt.getTime() / 1000)) {
        return null;
      }
    }

    return session;
  } catch {
    return null;
  }
}

export async function destroyKioskSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
