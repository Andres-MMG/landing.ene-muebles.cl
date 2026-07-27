import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { hashPassword, verifyPassword } from '@/lib/admin/auth';
import {
  signSessionToken,
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
} from '@/lib/admin/session';
import { isRateLimited, recordFailedAttempt, resetAttempts } from '@/lib/admin/rate-limit';
import {
  findAdminUserByEmail,
  updateAdminUserLastLogin,
} from '@/lib/admin/strapi-admin';

// Disable any caching of the login response.
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const LoginBody = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(1).max(256),
});

function clientIp(req: NextRequest): string {
  // Prefer the first IP in X-Forwarded-For (set by the reverse proxy
  // / load balancer in front of Next). Fall back to a constant so the
  // rate-limiter has somewhere to key.
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.headers.get('x-real-ip') ?? 'unknown';
}

export async function POST(req: NextRequest) {
  const ip = clientIp(req);

  // 1. Rate limit: if the IP is locked out, fail fast.
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: 'Demasiados intentos. Probá de nuevo en 15 minutos.' },
      { status: 429, headers: { 'Retry-After': '900' } }
    );
  }

  // 2. Validate body.
  let body: z.infer<typeof LoginBody>;
  try {
    const json = await req.json();
    body = LoginBody.parse(json);
  } catch {
    recordFailedAttempt(ip);
    return NextResponse.json(
      { error: 'Email o contraseña inválidos.' },
      { status: 400 }
    );
  }

  // 3. Look up the admin user.
  const user = await findAdminUserByEmail(body.email);
  if (!user || !user.active) {
    recordFailedAttempt(ip);
    return NextResponse.json(
      { error: 'Email o contraseña inválidos.' },
      { status: 401 }
    );
  }

  // 4. Verify the password.
  const ok = await verifyPassword(body.password, user.passwordHash);
  if (!ok) {
    const result = recordFailedAttempt(ip);
    if (result.locked) {
      return NextResponse.json(
        { error: 'Demasiados intentos. Probá de nuevo en 15 minutos.' },
        { status: 429, headers: { 'Retry-After': String(result.retryAfterSeconds) } }
      );
    }
    return NextResponse.json(
      { error: 'Email o contraseña inválidos.' },
      { status: 401 }
    );
  }

  // 5. Success: clear the rate limit, mint a JWT, set the cookie.
  resetAttempts(ip);
  const token = await signSessionToken({
    sub: user.documentId,
    role: user.role,
  });
  // Update lastLoginAt in Strapi. Fire-and-forget; failure is not
  // fatal to the login response.
  updateAdminUserLastLogin(user.documentId).catch((err) => {
    console.error('[admin/login] failed to update lastLoginAt:', err);
  });

  const res = NextResponse.json({
    user: {
      email: user.email,
      name: user.name,
      role: user.role,
    },
  });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  return res;
}

// Avoid TS unused-import warning for hashPassword (kept for future
// self-service password change endpoints).
void hashPassword;
