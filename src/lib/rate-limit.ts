/**
 * Database-backed rate limiter for PIN and login brute-force protection.
 * VULN-04 / VULN-07 fix. Persists across restarts and works multi-instance.
 */

import { prisma } from "@/lib/prisma";

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 5 * 60 * 1000; // 5-minute window
const LOCKOUT_MS = 15 * 60 * 1000; // 15-minute lockout

export async function checkRateLimit(key: string): Promise<{
  allowed: boolean;
  retryAfterMs?: number;
}> {
  const entry = await prisma.loginAttempt.findUnique({
    where: { rateKey: key },
  });

  if (!entry) return { allowed: true };

  const now = new Date();

  // Currently locked out?
  if (entry.lockedUntil && entry.lockedUntil > now) {
    return { allowed: false, retryAfterMs: entry.lockedUntil.getTime() - now.getTime() };
  }

  // Window expired? Clean up.
  if (now.getTime() - entry.firstAttemptAt.getTime() > WINDOW_MS) {
    await prisma.loginAttempt.delete({ where: { rateKey: key } });
    return { allowed: true };
  }

  return { allowed: true };
}

export async function recordFailedAttempt(key: string): Promise<void> {
  const now = new Date();
  const entry = await prisma.loginAttempt.findUnique({
    where: { rateKey: key },
  });

  // No entry or window expired — start fresh
  if (!entry || now.getTime() - entry.firstAttemptAt.getTime() > WINDOW_MS) {
    await prisma.loginAttempt.upsert({
      where: { rateKey: key },
      create: { rateKey: key, count: 1, firstAttemptAt: now, lockedUntil: null },
      update: { count: 1, firstAttemptAt: now, lockedUntil: null },
    });
    return;
  }

  const newCount = entry.count + 1;

  if (newCount >= MAX_ATTEMPTS) {
    await prisma.loginAttempt.update({
      where: { rateKey: key },
      data: { count: 0, lockedUntil: new Date(now.getTime() + LOCKOUT_MS) },
    });
  } else {
    await prisma.loginAttempt.update({
      where: { rateKey: key },
      data: { count: newCount },
    });
  }
}

export async function clearRateLimit(key: string): Promise<void> {
  await prisma.loginAttempt.deleteMany({ where: { rateKey: key } });
}
