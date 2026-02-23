/**
 * In-memory rate limiter for PIN and login brute-force protection.
 * VULN-04 / VULN-07 fix.
 *
 * For multi-instance deployments, replace with Redis-backed rate limiting.
 */

interface RateLimitEntry {
  count: number;
  firstAttemptAt: number;
  lockedUntil: number;
}

const attempts = new Map<string, RateLimitEntry>();

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 5 * 60 * 1000; // 5-minute window
const LOCKOUT_MS = 15 * 60 * 1000; // 15-minute lockout

export function checkRateLimit(key: string): {
  allowed: boolean;
  retryAfterMs?: number;
} {
  const now = Date.now();
  const entry = attempts.get(key);

  if (!entry) return { allowed: true };

  // Currently locked out?
  if (entry.lockedUntil > now) {
    return { allowed: false, retryAfterMs: entry.lockedUntil - now };
  }

  // Window expired? Reset.
  if (now - entry.firstAttemptAt > WINDOW_MS) {
    attempts.delete(key);
    return { allowed: true };
  }

  return { allowed: true };
}

export function recordFailedAttempt(key: string): void {
  const now = Date.now();
  const entry = attempts.get(key);

  if (!entry || now - entry.firstAttemptAt > WINDOW_MS) {
    attempts.set(key, { count: 1, firstAttemptAt: now, lockedUntil: 0 });
    return;
  }

  entry.count += 1;

  if (entry.count >= MAX_ATTEMPTS) {
    entry.lockedUntil = now + LOCKOUT_MS;
    entry.count = 0; // Reset count for next window after lockout
  }

  attempts.set(key, entry);
}

export function clearRateLimit(key: string): void {
  attempts.delete(key);
}

// Periodic cleanup to prevent memory leaks (runs at most every 5 minutes)
let lastCleanup = Date.now();
export function cleanupStaleEntries(): void {
  const now = Date.now();
  if (now - lastCleanup < WINDOW_MS) return;
  lastCleanup = now;

  for (const [key, entry] of attempts) {
    if (entry.lockedUntil < now && now - entry.firstAttemptAt > WINDOW_MS) {
      attempts.delete(key);
    }
  }
}
