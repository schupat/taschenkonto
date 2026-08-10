import test from "node:test";
import assert from "node:assert/strict";
import { collectDueRunDates, computeNextRunAt } from "./allowance.service";

/**
 * The scheduler works in local time (`setHours`), so asserting on UTC strings
 * only holds in the timezone the expectations were written for — these tests
 * were pinned to Europe/Berlin and failed anywhere else, CI included.
 * Comparing local wall-clock components states the actual contract: 08:00 on
 * the target day, whatever the machine's timezone.
 */
const pad = (n: number) => String(n).padStart(2, "0");

function localSlot(date: Date): string {
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

test("computeNextRunAt schedules weekly rules on the requested weekday", () => {
  const from = new Date(2026, 2, 8, 12, 0); // Sunday

  const nextRunAt = computeNextRunAt("WEEKLY", from, 1, null); // Monday

  assert.equal(localSlot(nextRunAt), "2026-03-09 08:00");
});

test("computeNextRunAt keeps a same-day weekly run if the scheduled hour is still in the future", () => {
  const from = new Date(2026, 2, 9, 7, 30); // Monday, before the 08:00 slot

  const nextRunAt = computeNextRunAt("WEEKLY", from, 1, null);

  assert.equal(localSlot(nextRunAt), "2026-03-09 08:00");
});

test("computeNextRunAt clamps monthly rules to the last day of shorter months", () => {
  const from = new Date(2026, 1, 1, 12, 0);

  const nextRunAt = computeNextRunAt("MONTHLY", from, null, 31);

  assert.equal(localSlot(nextRunAt), "2026-02-28 08:00");
});

test("collectDueRunDates returns every missed allowance run and advances to the next future slot", () => {
  const nextRunAt = new Date(2026, 0, 31, 8, 0);
  const now = new Date(2026, 2, 31, 9, 0);

  const result = collectDueRunDates("MONTHLY", nextRunAt, now, null, 31);

  assert.deepEqual(result.dueRunDates.map(localSlot), [
    "2026-01-31 08:00",
    "2026-02-28 08:00",
    "2026-03-31 08:00",
  ]);
  assert.equal(localSlot(result.nextRunAt), "2026-04-30 08:00");
});
