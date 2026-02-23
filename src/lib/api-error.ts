/**
 * VULN-11 fix: Sanitize error messages returned to clients.
 * Never expose raw Prisma/internal errors.
 */

const KNOWN_ERRORS: Record<string, string> = {
  "Insufficient balance": "Insufficient balance",
  "Child not found": "Not found",
  "Investment not found": "Not found",
  "Already withdrawn": "Already withdrawn",
  "Festgeld has not matured yet": "Not matured yet",
  "Only Tagesgeld can be topped up": "Cannot top up this investment type",
  "Investment is not active": "Investment is not active",
  "No pending withdrawal found": "No pending withdrawal found",
  "Withdrawal already pending": "Withdrawal already pending",
  "Rule not found": "Not found",
  "Chore not found": "Not found",
  "Assignment not found": "Not found",
  "Already completed": "Already completed",
};

export function safeErrorMessage(e: unknown): string {
  if (e instanceof Error && e.message in KNOWN_ERRORS) {
    return KNOWN_ERRORS[e.message];
  }
  return "An error occurred";
}
