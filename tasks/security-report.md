# Taschenkonto Security Audit Report

**Date:** 2026-02-23
**Scope:** Full application -- authentication, API routes, data layer, kiosk system, client-side
**Methodology:** Manual code review of all source files, service functions, API handlers, middleware, and configuration

---

## Executive Summary

Taschenkonto is a family banking web app managing virtual money. While it does not handle real financial transactions, it stores PINs, passwords, and family data that require protection. The audit identified **17 unique findings** across 5 severity levels:

| Severity | Count | Key Concern |
|----------|-------|-------------|
| Critical | 2 | Hardcoded secrets enable token forgery |
| High | 5 | PIN brute-force, race conditions in financial ops, child interest rate abuse |
| Medium | 6 | Missing security headers, cron bypass, error leakage |
| Low | 4 | Cookie scoping, CSV injection, dead code |

The most dangerous attack chain: **Unauthenticated child enumeration + No PIN rate limiting + Hardcoded JWT secret = Full kiosk account takeover without any credentials.**

---

## Findings

---

### VULN-01: Hardcoded Fallback Secret for Kiosk JWT Signing

| Field | Value |
|-------|-------|
| **Severity** | CRITICAL |
| **CVSS 3.1** | **9.8** (AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H) |
| **File** | `src/lib/session.ts:5` |
| **CWE** | CWE-798 (Use of Hard-coded Credentials) |

**Description:** If `KIOSK_SESSION_SECRET` env var is unset, the app silently falls back to `"kiosk-dev-secret-change-me"` -- a string visible in the open-source repo. An attacker can forge valid kiosk JWTs for any child account.

**Impact:** Full impersonation of any child in any family. View balances, complete chores, create investments, request withdrawals.

**Fix:**
```typescript
// src/lib/session.ts -- Replace lines 4-6
const KIOSK_SECRET = process.env.KIOSK_SESSION_SECRET;
if (!KIOSK_SECRET) {
  throw new Error(
    "KIOSK_SESSION_SECRET is required. Generate with: openssl rand -base64 32"
  );
}
const secret = new TextEncoder().encode(KIOSK_SECRET);
```

---

### VULN-02: Insecure Default Secrets in .env.local

| Field | Value |
|-------|-------|
| **Severity** | CRITICAL |
| **CVSS 3.1** | **9.8** (AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H) |
| **File** | `.env.local:5,9,12` |
| **CWE** | CWE-1188 (Insecure Default Initialization of Resource) |

**Description:** Three secrets ship with human-readable placeholder values. If deployed without changing them, all auth mechanisms are compromised:
- `AUTH_SECRET` -- forges parent sessions
- `KIOSK_SESSION_SECRET` -- forges kiosk sessions
- `CRON_SECRET` -- triggers cron endpoints

**Impact:** Complete authentication bypass for all user types.

**Fix:** Add startup validation that rejects known placeholder values:
```typescript
// src/lib/env-check.ts (new file, import in root layout or instrumentation.ts)
const KNOWN_DEFAULTS = [
  "change-me-in-production",
  "change-me-kiosk-secret",
  "change-me-cron-secret",
  "kiosk-dev-secret-change-me",
];

function validateSecrets() {
  const secrets = {
    AUTH_SECRET: process.env.AUTH_SECRET,
    KIOSK_SESSION_SECRET: process.env.KIOSK_SESSION_SECRET,
    CRON_SECRET: process.env.CRON_SECRET,
  };

  for (const [name, value] of Object.entries(secrets)) {
    if (!value) throw new Error(`${name} is required`);
    if (KNOWN_DEFAULTS.some((d) => value.includes(d))) {
      throw new Error(`${name} contains a default placeholder. Generate a real secret.`);
    }
    if (value.length < 16) {
      throw new Error(`${name} is too short (minimum 16 characters)`);
    }
  }
}

if (process.env.NODE_ENV === "production") {
  validateSecrets();
}
```

---

### VULN-03: Unauthenticated Child Enumeration Endpoint

| Field | Value |
|-------|-------|
| **Severity** | HIGH |
| **CVSS 3.1** | **7.5** (AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N) |
| **File** | `src/app/api/kiosk/children/route.ts` |
| **CWE** | CWE-284 (Improper Access Control) |

**Description:** `GET /api/kiosk/children?family=<id>` requires zero authentication. Returns child names, IDs, and avatar emojis for any family. The IDs are the exact credential needed for PIN brute-forcing (VULN-04).

**Attack chain:** Guess/leak familyId -> enumerate children -> brute-force PINs -> full kiosk access.

**Fix:** Require a family-specific signed token in the URL instead of a raw familyId, or at minimum require a family-level passphrase. Alternative simpler fix: require the request come from the same origin.

---

### VULN-04: No Rate Limiting on PIN Login

| Field | Value |
|-------|-------|
| **Severity** | HIGH |
| **CVSS 3.1** | **8.1** (AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N) |
| **File** | `src/app/api/kiosk/login/route.ts` |
| **CWE** | CWE-307 (Improper Restriction of Excessive Authentication Attempts) |

**Description:** 4-digit PINs have only 10,000 combinations. No rate limiting, no lockout, no CAPTCHA. Brute-force completes in under 17 minutes at 10 req/s.

**Fix:** Add per-childAccountId rate limiting with lockout:
```typescript
// src/lib/rate-limit.ts (new file)
const attempts = new Map<string, { count: number; lockedUntil: number }>();
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

export function checkRateLimit(key: string): { allowed: boolean; retryAfterMs?: number } {
  const now = Date.now();
  const entry = attempts.get(key);
  if (entry && entry.lockedUntil > now) {
    return { allowed: false, retryAfterMs: entry.lockedUntil - now };
  }
  if (entry && entry.lockedUntil <= now) attempts.delete(key);
  return { allowed: true };
}

export function recordFailedAttempt(key: string): void {
  const now = Date.now();
  const entry = attempts.get(key) || { count: 0, lockedUntil: 0 };
  entry.count += 1;
  if (entry.count >= MAX_ATTEMPTS) {
    entry.lockedUntil = now + LOCKOUT_MS;
    entry.count = 0;
  }
  attempts.set(key, entry);
}

export function clearRateLimit(key: string): void {
  attempts.delete(key);
}
```

---

### VULN-05: Race Condition in Investment Creation (Double-Spend)

| Field | Value |
|-------|-------|
| **Severity** | HIGH |
| **CVSS 3.1** | **7.5** (AV:N/AC:L/PR:L/UI:N/S:U/C:N/I:H/A:N) |
| **File** | `src/lib/services/investment.service.ts:47-116` |
| **CWE** | CWE-362 (TOCTOU Race Condition) |

**Description:** `createInvestment()` performs check-then-act without atomicity:
1. Checks saldo (aggregate query)
2. Compares saldo >= amountCents
3. Creates investment (separate query)
4. Creates withdrawal transaction (separate query)

Steps 1-4 are NOT wrapped in a `$transaction`. Two concurrent requests both pass the balance check before either writes, allowing investment of more money than available.

Same pattern exists in `topUpInvestment()` (lines 163-207) and `approveWithdrawal()` (lines 237-276).

**Fix:** Wrap the entire check+write in an interactive Prisma transaction:
```typescript
return prisma.$transaction(async (tx) => {
  // Balance check INSIDE the transaction
  const { _sum } = await tx.transaction.aggregate({
    where: { childAccountId },
    _sum: { amountCents: true },
  });
  const saldo = _sum.amountCents ?? 0;
  if (saldo < data.amountCents) throw new Error("Insufficient balance");

  const investment = await tx.investment.create({ data: { /* ... */ } });
  await tx.transaction.create({ data: { /* withdrawal tx */ } });
  return investment;
});
```

---

### VULN-06: Child Can Set Own Interest Rate (Up to 100% APR)

| Field | Value |
|-------|-------|
| **Severity** | HIGH |
| **CVSS 3.1** | **6.5** (AV:N/AC:L/PR:L/UI:N/S:U/C:N/I:H/A:N) |
| **File** | `src/app/api/kiosk/investments/route.ts` + `src/lib/validations/investment.ts` |
| **CWE** | CWE-20 (Improper Input Validation) |

**Description:** The kiosk investment creation endpoint accepts `interestRateBps` directly from the request body (0-10000). While the UI presents a fixed rate, any kiosk session holder can craft a direct API request with `interestRateBps: 10000` (100% APR).

**Fix:** Server-side rate enforcement -- ignore client-provided rates, use family-configured or system defaults:
```typescript
// Override client-provided interest rate with server defaults
const enforcedRate = parsed.data.type === "TAGESGELD" ? 300 : 500; // 3% / 5%
const enforcedData = { ...parsed.data, interestRateBps: enforcedRate };
```

---

### VULN-07: No Rate Limiting on Parent Login

| Field | Value |
|-------|-------|
| **Severity** | HIGH |
| **CVSS 3.1** | **7.5** (AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N) |
| **File** | `src/lib/auth.ts:19-33` |
| **CWE** | CWE-307 (Improper Restriction of Excessive Authentication Attempts) |

**Description:** Auth.js credentials provider has no rate limiting, lockout, or CAPTCHA. Vulnerable to credential stuffing.

**Fix:** Apply the same `checkRateLimit` mechanism from VULN-04 to the credentials authorize function, keyed by email address.

---

### VULN-08: Cron Secret Bypass When Env Var Unset

| Field | Value |
|-------|-------|
| **Severity** | MEDIUM |
| **CVSS 3.1** | **6.8** (AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:H/A:N) |
| **File** | `src/app/api/cron/allowance/route.ts:6`, `src/app/api/cron/investments/route.ts:6` |
| **CWE** | CWE-287 (Improper Authentication) |

**Description:** If `CRON_SECRET` is unset, the check becomes `authHeader !== "Bearer undefined"`. Sending `Authorization: Bearer undefined` authenticates successfully. Also uses non-constant-time string comparison (timing attack vector).

**Fix:**
```typescript
const CRON_SECRET = process.env.CRON_SECRET;
if (!CRON_SECRET) {
  return NextResponse.json({ error: "Cron not configured" }, { status: 503 });
}
// Use constant-time comparison
const expected = Buffer.from(`Bearer ${CRON_SECRET}`);
const actual = Buffer.from(authHeader || "");
if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
```

---

### VULN-09: No Security Headers (CSP, X-Frame-Options, HSTS)

| Field | Value |
|-------|-------|
| **Severity** | MEDIUM |
| **CVSS 3.1** | **5.4** (AV:N/AC:L/PR:N/UI:R/S:U/C:L/I:L/A:N) |
| **File** | `next.config.ts` |
| **CWE** | CWE-1021 (Improper Restriction of Rendered UI Layers) |

**Description:** No CSP, X-Frame-Options, X-Content-Type-Options, Strict-Transport-Security, or Referrer-Policy headers. The kiosk page can be iframed for clickjacking. Family IDs leak via Referer headers.

**Fix:** Add `headers()` function to `next.config.ts` with appropriate security headers.

---

### VULN-10: Concurrent Cron Double-Booking

| Field | Value |
|-------|-------|
| **Severity** | MEDIUM |
| **CVSS 3.1** | **5.3** (AV:N/AC:H/PR:L/UI:N/S:U/C:N/I:H/A:N) |
| **File** | `src/lib/services/allowance.service.ts:84-116`, `src/lib/services/investment.service.ts:312-377` |
| **CWE** | CWE-362 (Race Condition) |

**Description:** Both allowance and investment cron jobs can double-process if invoked simultaneously. Two concurrent requests find the same due rules/investments, both pass the `nextRunAt <= now` check, both write transactions.

**Fix:** Use atomic UPDATE with WHERE condition that claims the row:
```typescript
const updated = await tx.allowanceRule.updateMany({
  where: { id: rule.id, nextRunAt: { lte: now } },
  data: { nextRunAt: next },
});
if (updated.count === 0) continue; // Already processed
```

---

### VULN-11: Error Messages Leak Internal Details

| Field | Value |
|-------|-------|
| **Severity** | MEDIUM |
| **CVSS 3.1** | **5.3** (AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N) |
| **File** | Multiple API routes (all catch blocks surfacing `e.message`) |
| **CWE** | CWE-209 (Generation of Error Message Containing Sensitive Information) |

**Description:** Many catch blocks return raw `e.message` to the client, which can include Prisma error messages with table names, column names, and constraint details.

**Fix:** Use an error mapping utility that maps known errors and returns a generic message for unexpected errors.

---

### VULN-12: Middleware Only Checks Cookie Existence (Not JWT Validity)

| Field | Value |
|-------|-------|
| **Severity** | MEDIUM |
| **CVSS 3.1** | **4.3** (AV:N/AC:L/PR:N/UI:R/S:U/C:L/I:N/A:N) |
| **File** | `src/proxy.ts:41-47` |
| **CWE** | CWE-306 (Missing Authentication for Critical Function) |

**Description:** The proxy only checks if the `kiosk-session` cookie exists. Any non-empty string passes. While API routes verify the JWT, the page shell renders for invalid cookies.

**Fix:** Import `jwtVerify` from jose and verify the token in the proxy. Redirect to login and clear the cookie on failure.

---

### VULN-13: Top-Up Routes Lack Zod Validation (Accept Floats)

| Field | Value |
|-------|-------|
| **Severity** | MEDIUM |
| **CVSS 3.1** | **4.3** (AV:N/AC:L/PR:L/UI:N/S:U/C:N/I:L/A:N) |
| **File** | `src/app/api/children/[childId]/investments/[investmentId]/topup/route.ts`, `src/app/api/kiosk/investments/[investmentId]/topup/route.ts` |
| **CWE** | CWE-20 (Improper Input Validation) |

**Description:** Both top-up routes use manual validation that accepts floats (e.g. `10.5`), has no upper bound, and no `Number.isSafeInteger()` check.

**Fix:** Replace with Zod schema: `z.object({ amountCents: z.number().int().positive().max(10_000_00) })`

---

### VULN-14: No CSRF Protection on State-Mutating Endpoints

| Field | Value |
|-------|-------|
| **Severity** | LOW |
| **CVSS 3.1** | **3.1** (AV:N/AC:H/PR:N/UI:R/S:U/C:N/I:L/A:N) |
| **File** | All POST/PATCH/DELETE routes |
| **CWE** | CWE-352 (Cross-Site Request Forgery) |

**Description:** SameSite=lax cookies mitigate most CSRF, but no explicit CSRF token is used. Edge cases in some browsers could allow CSRF on POST endpoints.

**Fix:** Verify the `Origin` header on all state-changing requests as defense-in-depth.

---

### VULN-15: CSV Export Formula Injection

| Field | Value |
|-------|-------|
| **Severity** | LOW |
| **CVSS 3.1** | **3.5** (AV:N/AC:L/PR:L/UI:R/S:U/C:N/I:L/A:N) |
| **File** | `src/app/api/children/[childId]/transactions/export/route.ts:35-39` |
| **CWE** | CWE-1236 (Improper Neutralization of Formula Elements in CSV) |

**Description:** Transaction descriptions starting with `=`, `+`, `-`, `@` are not sanitized. Excel interprets these as formulas.

**Fix:** Prefix cell values starting with formula-trigger characters with a single quote `'`.

---

### VULN-16: Kiosk Cookie Path Overly Broad

| Field | Value |
|-------|-------|
| **Severity** | LOW |
| **CVSS 3.1** | **2.4** (AV:N/AC:H/PR:N/UI:N/S:U/C:L/I:N/A:N) |
| **File** | `src/lib/session.ts:24` |
| **CWE** | CWE-1004 (Sensitive Cookie in Broad Scope) |

**Description:** Kiosk session cookie has `path: "/"`, sending it to all routes including parent-facing pages.

**Fix:** Change to `path: "/kiosk"`.

---

### VULN-17: Seed Script Has No Production Guard

| Field | Value |
|-------|-------|
| **Severity** | LOW |
| **CVSS 3.1** | **2.1** (AV:L/AC:L/PR:H/UI:R/S:U/C:N/I:L/A:N) |
| **File** | `prisma/seed.ts` |
| **CWE** | CWE-749 (Exposed Dangerous Method) |

**Description:** The seed script runs `deleteMany()` on all tables before seeding. No `NODE_ENV` check prevents accidental execution against production.

**Fix:** Add `if (process.env.NODE_ENV === "production") { process.exit(1); }` at the top.

---

## Attack Chain Analysis

### Chain 1: Full Kiosk Account Takeover (No Credentials Required)

```
VULN-03 (enumerate children) -> VULN-04 (brute-force PIN) -> Full kiosk access
```

**Prerequisites:** Attacker knows or guesses a familyId (CUIDs have timestamp-based prefix)
**Effort:** ~17 minutes for a 4-digit PIN brute-force
**If VULN-01 is present:** Skip PIN brute-force entirely, forge JWT directly

### Chain 2: Virtual Money Inflation

```
VULN-06 (child sets 100% APR) -> Cron processes interest -> VULN-05 (race condition for overdraft)
```

**Prerequisites:** Valid kiosk session
**Impact:** Unlimited virtual money creation

---

## Priority Remediation Roadmap

### Immediate (Week 1)
1. **VULN-01**: Remove hardcoded fallback secret -- fail if env var missing
2. **VULN-02**: Add startup secret validation
3. **VULN-04**: Add rate limiting to PIN login (in-memory is fine for MVP)
4. **VULN-03**: Require authentication on `/api/kiosk/children`

### Short-term (Week 2-3)
5. **VULN-05**: Wrap financial operations in interactive Prisma transactions
6. **VULN-06**: Server-side interest rate enforcement
7. **VULN-07**: Rate limiting on parent login
8. **VULN-08**: Fix cron secret validation + constant-time comparison
9. **VULN-09**: Add security headers in next.config.ts

### Medium-term (Month 1)
10. **VULN-10**: Fix concurrent cron double-booking with atomic claims
11. **VULN-11**: Sanitize error messages
12. **VULN-12**: JWT verification in middleware
13. **VULN-13**: Add Zod validation to top-up routes

### Low Priority
14. **VULN-14**: CSRF token / Origin verification
15. **VULN-15**: CSV formula sanitization
16. **VULN-16**: Narrow cookie path
17. **VULN-17**: Production guard on seed script

---

## Positive Findings

The following security practices are well-implemented:

1. **Passwords and PINs properly hashed** with bcrypt (cost 10)
2. **Consistent tenant isolation** -- all parent services include `familyId` in queries
3. **Prisma parameterized queries** -- no SQL injection vectors found
4. **React JSX escaping** -- no unsafe HTML rendering (zero instances of unsafe innerHTML usage)
5. **Cookie security attributes** -- HttpOnly, Secure (production), SameSite=lax
6. **Signed amounts** -- `Math.abs()` enforces correct sign on transactions
7. **Atomic chore approval** -- `$transaction` prevents double-rewarding
8. **Withdrawal requires parent approval** -- proper separation of concerns
9. **.env files in .gitignore** -- secrets not committed to source control
