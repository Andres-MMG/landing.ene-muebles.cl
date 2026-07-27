/**
 * In-memory rate limiter for the admin login endpoint.
 *
 * v1 uses a Map keyed by IP. That works for a single-process Next.js
 * deployment. When the app scales horizontally (multiple Node
 * processes), this becomes per-process and the limit becomes "limit
 * per process per IP" — still better than no limit, but the swap to
 * a shared store (Redis, Upstash) is straightforward.
 *
 * Algorithm: fixed-window per IP. At most 5 failed attempts in any
 * 15-minute window, then locked out for 15 minutes regardless of
 * whether the subsequent attempts are successful.
 *
 * We reset the counter on success so legitimate users are not
 * affected by previous bad attempts from the same IP (shared NAT etc.).
 */

type Bucket = {
  count: number;
  windowStart: number; // ms epoch
  lockedUntil: number; // ms epoch, 0 = not locked
};

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

const buckets = new Map<string, Bucket>();

function bucketFor(ip: string): Bucket {
  const now = Date.now();
  const b = buckets.get(ip);
  if (!b) {
    const fresh: Bucket = { count: 0, windowStart: now, lockedUntil: 0 };
    buckets.set(ip, fresh);
    return fresh;
  }
  if (b.lockedUntil > now) return b;
  if (now - b.windowStart > WINDOW_MS) {
    b.count = 0;
    b.windowStart = now;
  }
  return b;
}

export function isRateLimited(ip: string): boolean {
  const b = bucketFor(ip);
  if (b.lockedUntil > Date.now()) return true;
  return false;
}

export function recordFailedAttempt(ip: string): {
  locked: boolean;
  retryAfterSeconds: number;
} {
  const now = Date.now();
  const b = bucketFor(ip);
  b.count += 1;
  if (b.count >= MAX_ATTEMPTS) {
    b.lockedUntil = now + LOCKOUT_MS;
    return { locked: true, retryAfterSeconds: Math.ceil(LOCKOUT_MS / 1000) };
  }
  return { locked: false, retryAfterSeconds: 0 };
}

export function resetAttempts(ip: string): void {
  buckets.delete(ip);
}

// For tests / dev: clear all rate-limit state.
export function _resetForTests(): void {
  buckets.clear();
}
