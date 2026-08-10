/**
 * Optional signup allowlist for parent logins.
 *
 * `ALLOWED_EMAILS` is a comma-separated list of addresses that may request a
 * magic link. Unset or blank means open registration — the default for
 * self-hosted instances, where the operator is the first user. Set it on any
 * publicly reachable deployment, otherwise anyone can create a family (and
 * burn the Resend quota doing it).
 *
 * Read at call time, not at import, so changing the env var only needs a
 * container restart — no rebuild.
 */
export function isEmailAllowed(email?: string | null): boolean {
  const allowed = (process.env.ALLOWED_EMAILS ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);

  if (allowed.length === 0) return true;

  return allowed.includes((email ?? "").trim().toLowerCase());
}
