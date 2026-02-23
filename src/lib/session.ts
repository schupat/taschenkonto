import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

// VULN-01 fix: Fail loud if secret is missing in production
const KIOSK_SECRET = process.env.KIOSK_SESSION_SECRET;
if (!KIOSK_SECRET && process.env.NODE_ENV === "production") {
  throw new Error(
    "KIOSK_SESSION_SECRET is required in production. Generate with: openssl rand -base64 32"
  );
}
const secret = new TextEncoder().encode(
  KIOSK_SECRET || "dev-only-insecure-key-do-not-use-in-prod"
);
const COOKIE_NAME = "kiosk-session";

export async function createKioskSession(
  childAccountId: string,
  familyId: string
) {
  const token = await new SignJWT({ childAccountId, familyId })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("8h")
    .sign(secret);

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
    const { payload } = await jwtVerify(token, secret);
    return payload as { childAccountId: string; familyId: string };
  } catch {
    return null;
  }
}

export async function destroyKioskSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
