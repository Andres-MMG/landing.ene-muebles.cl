import { NextResponse, type NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { SESSION_SECRET_MIN_LENGTH } from '@/lib/admin/session';

/**
 * Edge middleware: gate /admin/* by the presence and validity of the
 * signed session cookie. We verify the JWT signature right here in the
 * edge runtime (no Node APIs) so an unauthenticated request never
 * reaches the React tree of /admin.
 *
 * The full session payload is NOT inspected here — we just need to
 * know the cookie is present and its signature is valid. Page-level
 * server components do the real role check via getServerSession().
 */
export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};

const COOKIE_NAME = 'ene_admin_session';

function getSecret(): Uint8Array | null {
  // Production and dev both fail closed: if the secret is missing or
  // shorter than SESSION_SECRET_MIN_LENGTH, we return null and the
  // middleware replies with 503 ("Admin disabled: missing secret").
  // There is no silent dev-only fallback string — that asymmetry was
  // a hidden foot-gun because a missing env var in production would
  // silently degrade to the dev fallback in older code paths. The
  // local `infrastructure/.env.local` ships a 50-char secret so dev
  // works as expected; CI / production must set the env var.
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret || secret.length < SESSION_SECRET_MIN_LENGTH) {
    return null;
  }
  return new TextEncoder().encode(secret);
}

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  // /admin/login (the page) must always be reachable, otherwise the
  // sign-in form itself gets bounced back to /admin/login?from=...
  // and the browser hits ERR_TOO_MANY_REDIRECTS. The page does its
  // own session check via getServerSession() and renders the form
  // when there is none. The corresponding API routes are also
  // exempt for the same reason.
  if (
    path === '/admin/login' ||
    path === '/api/admin/login' ||
    path === '/api/admin/session' ||
    path === '/api/admin/logout'
  ) {
    return NextResponse.next();
  }

  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    return redirectToLogin(req);
  }

  const secret = getSecret();
  if (!secret) {
    // Fail closed in BOTH dev and production. Dev users with a missing
    // or short secret will see the same 503 as production; the fix
    // is to populate `ADMIN_SESSION_SECRET` in `infrastructure/.env.local`.
    return new NextResponse('Admin disabled: missing secret', { status: 503 });
  }

  try {
    await jwtVerify(token, secret, { algorithms: ['HS256'] });
    return NextResponse.next();
  } catch {
    return redirectToLogin(req);
  }
}

function redirectToLogin(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith('/api/')) {
    return new NextResponse(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { 'content-type': 'application/json' } }
    );
  }
  const url = req.nextUrl.clone();
  url.pathname = '/admin/login';
  url.searchParams.set('from', req.nextUrl.pathname);
  return NextResponse.redirect(url);
}
