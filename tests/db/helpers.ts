/**
 * Shared setup for the database-backed tests.
 *
 * These run against a real Postgres because the invariants under test — the
 * idempotency claim in `processAllowances`, the unique constraint behind
 * "already reverted", the `$transaction` around approve+credit — only exist in
 * the database. A mocked Prisma would assert the mock, not the invariant.
 *
 * All files here share one database and truncate it between tests, so they
 * must run serially — `npm run test:db` passes --test-concurrency=1.
 *
 * Start a throwaway database with:
 *   docker run -d --name taschenkonto-test-db -p 55432:5432 \
 *     -e POSTGRES_USER=test -e POSTGRES_PASSWORD=test \
 *     -e POSTGRES_DB=taschenkonto_test postgres:17-alpine
 *   DATABASE_URL=... npx prisma migrate deploy
 */
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

const url = process.env.DATABASE_URL ?? "";

// resetDb() truncates everything. Refuse to point at anything that isn't
// obviously a test database — a misconfigured DATABASE_URL must not be able
// to wipe a real family's data.
if (!/test/i.test(url)) {
  throw new Error(
    `Refusing to run destructive tests against DATABASE_URL=${url || "(unset)"}. ` +
      `The database name must contain "test".`
  );
}

export { prisma };

export async function resetDb() {
  // TRUNCATE ... CASCADE in one statement so FK order does not matter.
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      "Transaction", "ChoreCompletion", "ChoreAssignment", "Chore",
      "AllowanceRule", "SavingGoal", "Investment", "ChildAccount",
      "LoginAttempt", "VerificationToken", "Account", "User", "Family"
    RESTART IDENTITY CASCADE
  `);
}

let seq = 0;

export async function makeFamily(name = "Testfamilie") {
  return prisma.family.create({
    data: { name, currency: "EUR", timezone: "Europe/Berlin" },
  });
}

export async function makeChild(
  familyId: string,
  opts: { name?: string; pin?: string } = {}
) {
  seq += 1;
  return prisma.childAccount.create({
    data: {
      name: opts.name ?? `Kind ${seq}`,
      avatarEmoji: "🧒",
      hashedPin: await bcrypt.hash(opts.pin ?? "1234", 4),
      familyId,
    },
  });
}

/** Credits `amountCents` so a child has something to spend or invest. */
export async function credit(childAccountId: string, amountCents: number) {
  return prisma.transaction.create({
    data: {
      amountCents,
      type: "DEPOSIT",
      origin: "MANUAL",
      description: "Test-Startguthaben",
      childAccountId,
    },
  });
}

export async function saldoOf(childAccountId: string): Promise<number> {
  const { _sum } = await prisma.transaction.aggregate({
    where: { childAccountId },
    _sum: { amountCents: true },
  });
  return _sum.amountCents ?? 0;
}
