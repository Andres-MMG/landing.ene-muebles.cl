/**
 * In-memory per-IP rate limiter for the public lead submission
 * endpoint (lead-capture spec — Backend Abuse Controls).
 *
 * Two sliding windows per IP:
 *   - per-minute: `perMinute` submissions (default 5)
 *   - per-day: `dailyCap` submissions (default 100)
 *
 * Module state is intentionally process-local: it resets on deploy,
 * which is acceptable for a landing page. Each route-handler module
 * instance creates ONE limiter via `createRateLimiter`; tests
 * re-import the module (vi.resetModules) to get a fresh instance.
 *
 * Memory bound: every `check` first evicts keys whose window has
 * expired, so the maps stay proportional to the distinct identities
 * active within the current windows — never to the total seen so far.
 */

export type RateLimitConfig = {
  perMinute: number;
  dailyCap: number;
};

export type RateLimitDecision = {
  allowed: boolean;
  retryAfterSeconds: number;
};

const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * 60 * 1000;

export function createRateLimiter({ perMinute, dailyCap }: RateLimitConfig) {
  const minuteHits = new Map<string, number[]>();
  const dailyHits = new Map<string, number[]>();

  return function check(ip: string, now = Date.now()): RateLimitDecision {
    // Prune stale keys first so a flood of spoofed identities (the
    // client can forge `x-forwarded-for` values) can never grow the
    // in-memory maps unboundedly: any key whose most recent hit is
    // outside its window is dropped and its whole entry dies with it.
    for (const [key, hits] of minuteHits) {
      if (now - (hits[hits.length - 1] ?? 0) >= MINUTE_MS) minuteHits.delete(key);
    }
    for (const [key, hits] of dailyHits) {
      if (now - (hits[hits.length - 1] ?? 0) >= DAY_MS) dailyHits.delete(key);
    }

    const minute = (minuteHits.get(ip) ?? []).filter((t) => now - t < MINUTE_MS);
    const daily = (dailyHits.get(ip) ?? []).filter((t) => now - t < DAY_MS);

    const minuteExceeded = minute.length >= perMinute;
    const dailyExceeded = daily.length >= dailyCap;

    if (!minuteExceeded && !dailyExceeded) {
      minute.push(now);
      daily.push(now);
      minuteHits.set(ip, minute);
      dailyHits.set(ip, daily);
      return { allowed: true, retryAfterSeconds: 0 };
    }

    const retryAfterSeconds = Math.max(
      minuteExceeded ? Math.ceil((minute[0]! + MINUTE_MS - now) / 1000) : 0,
      dailyExceeded ? Math.ceil((daily[0]! + DAY_MS - now) / 1000) : 0,
    );
    return { allowed: false, retryAfterSeconds: Math.max(1, retryAfterSeconds) };
  };
}
