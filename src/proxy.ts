import createIntlMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { NextResponse } from "next/server";
import { auth } from "./lib/auth";
import { jwtVerify } from "jose";

const intlMiddleware = createIntlMiddleware(routing);

// Routes that require parent auth (after locale prefix is stripped)
const PROTECTED_APP_ROUTES = ["/dashboard", "/children", "/chores", "/allowance", "/approvals"];
// Routes that require kiosk session
const PROTECTED_KIOSK_ROUTES = ["/kiosk"];
const KIOSK_LOGIN_PATH = "/kiosk/login";

function getPathWithoutLocale(pathname: string): string {
  const localePattern = /^\/(de|en)(\/|$)/;
  return pathname.replace(localePattern, "/");
}

export default auth(async function middleware(req) {
  const path = getPathWithoutLocale(req.nextUrl.pathname);

  // Check parent auth for (app) routes using Auth.js session
  const isAppRoute = PROTECTED_APP_ROUTES.some(
    (route) => path === route || path.startsWith(route + "/")
  );

  if (isAppRoute && !req.auth) {
    const loginUrl = new URL("/login", req.url);
    return NextResponse.redirect(loginUrl);
  }

  // Check kiosk session for kiosk routes (except login)
  const isKioskRoute =
    PROTECTED_KIOSK_ROUTES.some(
      (route) => path === route || path.startsWith(route + "/")
    ) && path !== KIOSK_LOGIN_PATH;

  // VULN-12 fix: Verify kiosk JWT, not just cookie existence
  if (isKioskRoute) {
    const kioskToken = req.cookies.get("kiosk-session")?.value;
    if (!kioskToken) {
      const kioskLoginUrl = new URL("/kiosk/login", req.url);
      return NextResponse.redirect(kioskLoginUrl);
    }
    try {
      // Always verify JWT — use same fallback key as session.ts in dev
      const kioskSecret = process.env.KIOSK_SESSION_SECRET || "dev-only-insecure-key-do-not-use-in-prod";
      const secret = new TextEncoder().encode(kioskSecret);
      await jwtVerify(kioskToken, secret);
    } catch {
      const res = NextResponse.redirect(new URL("/kiosk/login", req.url));
      res.cookies.delete("kiosk-session");
      return res;
    }
  }

  return intlMiddleware(req);
});

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
