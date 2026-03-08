import test from "node:test";
import assert from "node:assert/strict";
import { collectDueRunDates, computeNextRunAt } from "./allowance.service";

test("computeNextRunAt schedules weekly rules on the requested weekday", () => {
  const from = new Date("2026-03-08T12:00:00+01:00");

  const nextRunAt = computeNextRunAt("WEEKLY", from, 1, null);

  assert.equal(nextRunAt.toISOString(), "2026-03-09T07:00:00.000Z");
});

test("computeNextRunAt keeps a same-day weekly run if the scheduled hour is still in the future", () => {
  const from = new Date("2026-03-09T07:30:00+01:00");

  const nextRunAt = computeNextRunAt("WEEKLY", from, 1, null);

  assert.equal(nextRunAt.toISOString(), "2026-03-09T07:00:00.000Z");
});

test("computeNextRunAt clamps monthly rules to the last day of shorter months", () => {
  const from = new Date("2026-02-01T12:00:00+01:00");

  const nextRunAt = computeNextRunAt("MONTHLY", from, null, 31);

  assert.equal(nextRunAt.toISOString(), "2026-02-28T07:00:00.000Z");
});

test("collectDueRunDates returns every missed allowance run and advances to the next future slot", () => {
  const nextRunAt = new Date("2026-01-31T08:00:00+01:00");
  const now = new Date("2026-03-31T09:00:00+02:00");

  const result = collectDueRunDates("MONTHLY", nextRunAt, now, null, 31);

  assert.deepEqual(
    result.dueRunDates.map((date) => date.toISOString()),
    [
      "2026-01-31T07:00:00.000Z",
      "2026-02-28T07:00:00.000Z",
      "2026-03-31T06:00:00.000Z",
    ]
  );
  assert.equal(result.nextRunAt.toISOString(), "2026-04-30T06:00:00.000Z");
});
