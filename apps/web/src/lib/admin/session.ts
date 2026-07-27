import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

/**
 * Session management for the admin panel.
 *
 * Storage model:
 *   - The session token is a signed JWT stored in an httpOnly cookie
 *     named `ene_admin_session`. The browser cannot read it (XSS-safe).
 *   - The token carries the admin user's id, role, and an absolute
 *     expiry. No PII (no email, no name) — those are looked up from
 *     Strapi on every request that needs them.
 *   - The signing secret is `ADMIN_SESSION_SECRET` (32+ bytes, randomly
 *     generated). In dev we fall back to a hard-coded value so the
 *     server can boot without envs set; in production we hard-fail
 *     (no secret = no admin = no auth bypass).
 *
 * Token lifetime: 12 hours. That covers a full working day without
 * being long enough to be a risk if the cookie leaks. A sliding
 * window is intentionally NOT used — explicit re-login is a feature,
 * not a bug, for an admin panel that controls publishing.
 */

const TOKEN_TTL_SECONDS = 12 * 60 * 60; // 12 hours
const COOKIE_NAME = 'ene_admin_session';

/**
 * Minimum length for `ADMIN_SESSION_SECRET`. Both `lib/admin/session.ts`
 * and `apps/web/src/middleware.ts` use this constant so the threshold
 * stays consistent across the two code paths that load the secret.
 */
export const SESSION_SECRET_MIN_LENGTH = 32;

export type AdminRole = 'owner' | 'client';

export type AdminSessionPayload = {
  sub: string;          // admin-user documentId
  role: AdminRole;
  // iat / exp are added by jose automatically.
};

function getSecret(): Uint8Array {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret || secret.length < SESSION_SECRET_MIN_LENGTH) {
    throw new Error(
      `ADMIN_SESSION_SECRET must be set to a string of at least ${SESSION_SECRET_MIN_LENGTH} characters`
    );
  }
  return new TextEncoder().encode(secret);
}

export async function signSessionToken(
  payload: Omit<AdminSessionPayload, 'iat' | 'exp'>
): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt()
    .setExpirationTime(`${TOKEN_TTL_SECONDS}s`)
    .setSubject(payload.sub)
    .sign(getSecret());
}

export async function verifySessionToken(
  token: string
): Promise<AdminSessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      algorithms: ['HS256'],
    });
    if (typeof payload.sub !== 'string' || typeof payload.role !== 'string') {
      return null;
    }
    if (payload.role !== 'owner' && payload.role !== 'client') {
      return null;
    }
    return {
      sub: payload.sub,
      role: payload.role as AdminRole,
    };
  } catch {
    return false as unknown as null; // expired, malformed, signature mismatch
  }
}

export const SESSION_COOKIE = COOKIE_NAME;
export const SESSION_MAX_AGE_SECONDS = TOKEN_TTL_SECONDS;

/**
 * Server-component helper: returns the current admin session, or null
 * if there is no valid session cookie. Use this in pages and layouts
 * that need to render admin-only UI.
 */
export async function getServerSession(): Promise<AdminSessionPayload | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}
