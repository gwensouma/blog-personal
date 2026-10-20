// Derives a per-client key from X-Forwarded-For. Pure, so it is unit-tested without a
// request; the comment rate limit uses it, and the admin login throttle can reuse it.

/**
 * The trimmed right-most non-empty X-Forwarded-For entry when `trustProxy`, else null.
 * Right-most, because a proxy appends the address it saw: every entry to the left of it
 * came from the client and can be forged. Null also for a missing or all-empty header.
 */
export function clientKeyFrom(forwardedFor: string | null, trustProxy: boolean): string | null {
  if (!trustProxy || forwardedFor === null) return null;
  const entries = forwardedFor
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
  return entries.at(-1) ?? null;
}
