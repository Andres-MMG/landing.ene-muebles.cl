import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/admin/session';
import { _resetForTests } from '@/lib/admin/rate-limit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Admin-only escape hatch for the in-memory rate limiter.
 *
 * The login rate limiter keys by client IP, but in a Docker local-dev
 * setup without a reverse proxy that strips/normalizes headers,
 * `clientIp(req)` falls back to the literal string 'unknown', which
 * groups every request from the same container under the same bucket.
 * During heavy testing (or when the backend restarts mid-login) it
 * is easy to trip the 5-failed-attempts threshold and get locked out
 * for 15 minutes with no way to recover short of restarting `web`.
 *
 * Authenticated admins can call this endpoint to clear all buckets
 * and resume work. The endpoint is rejected for unauthenticated
 * requests; it does NOT clear buckets based on the requester IP, so
 * it cannot be abused to bypass the rate limiter on /api/admin/login.
 */
export async function POST() {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  _resetForTests();
  return NextResponse.json({ ok: true, cleared: true });
}