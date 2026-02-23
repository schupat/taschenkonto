/**
 * Calculate compound interest projection month by month.
 * Pure function -- no database access. Safe for client and server usage.
 */
export function getInvestmentProjection(
  principalCents: number,
  rateBps: number,
  months: number
): { month: number; balanceCents: number; interestCents: number }[] {
  const projection: {
    month: number;
    balanceCents: number;
    interestCents: number;
  }[] = [];
  let balance = principalCents;

  for (let m = 1; m <= months; m++) {
    const interest = Math.floor((balance * rateBps) / (10000 * 12));
    balance += interest;
    projection.push({
      month: m,
      balanceCents: balance,
      interestCents: interest,
    });
  }

  return projection;
}
