import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getInvestmentProjection } from "./investment-projection";

describe("getInvestmentProjection", () => {
  it("returns one entry per month", () => {
    assert.equal(getInvestmentProjection(10_000, 1200, 6).length, 6);
    assert.deepEqual(getInvestmentProjection(10_000, 1200, 0), []);
  });

  it("applies the monthly twelfth of the annual rate", () => {
    // 12% p.a. on 100.00 € → 1% per month
    const [first] = getInvestmentProjection(10_000, 1200, 1);
    assert.equal(first.interestCents, 100);
    assert.equal(first.balanceCents, 10_100);
  });

  it("compounds — month two earns interest on month one's interest", () => {
    const [, second] = getInvestmentProjection(10_000, 1200, 2);
    assert.equal(second.interestCents, 101);
    assert.equal(second.balanceCents, 10_201);
  });

  it("keeps balance and interest consistent across the whole run", () => {
    const projection = getInvestmentProjection(12_345, 350, 24);

    let balance = 12_345;
    for (const month of projection) {
      balance += month.interestCents;
      assert.equal(month.balanceCents, balance, `month ${month.month}`);
    }
  });

  it("never invents fractional cents — interest is floored", () => {
    // 1% per month on 1.50 € is 1.5 cents; a child gets 1, not 2.
    const [first] = getInvestmentProjection(150, 1200, 1);
    assert.equal(first.interestCents, 1);
    assert.equal(first.balanceCents, 151);
    assert.ok(Number.isInteger(first.interestCents));
  });

  it("pays nothing on a zero balance or a zero rate", () => {
    assert.deepEqual(getInvestmentProjection(0, 1200, 2), [
      { month: 1, balanceCents: 0, interestCents: 0 },
      { month: 2, balanceCents: 0, interestCents: 0 },
    ]);
    assert.deepEqual(getInvestmentProjection(10_000, 0, 1), [
      { month: 1, balanceCents: 10_000, interestCents: 0 },
    ]);
  });

  it("does not grow a balance too small to earn a full cent", () => {
    // 1% per month on 50 cents rounds to 0 — it must not creep upward.
    const projection = getInvestmentProjection(50, 1200, 12);
    assert.equal(projection[11].balanceCents, 50);
  });
});
