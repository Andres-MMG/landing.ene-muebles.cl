/**
 * Strapi client for the admin panel.
 *
 * Re-uses the same `STRAPI_INTERNAL_URL` and `STRAPI_API_TOKEN` as
 * the public frontend, but the auth header and the response shape are
 * the same. The admin token is a full-access custom API token; in
 * production it should be a separate token with only the permissions
 * the admin actually needs (find/update on product and category).
 *
 * Functions:
 *   - findAdminUserByEmail
 *   - updateAdminUserLastLogin
 *   - getAdminProducts (server-side proxy, bypasses public role perms)
 *   - getAdminProduct
 *   - updateAdminProduct
 */

const STRAPI = (process.env.STRAPI_INTERNAL_URL ?? 'http://cms:1337').replace(/\/+$/, '');

/**
 * Single source of truth for the Strapi admin-scoped API token used
 * by every `/api/admin/*` Next.js route handler. Precedence:
 *
 *   1. `STRAPI_ADMIN_TOKEN` (full-access, admin scope)
 *   2. `STRAPI_API_TOKEN` (read-only, public scope — legacy fallback)
 *   3. empty string (never undefined, never throws; route handlers
 *      receive the empty Authorization header and Strapi rejects)
 *
 * Route handlers MUST import this function instead of reading
 * `process.env.STRAPI_*` directly. Reading the env var directly
 * bypasses the fallback and causes 401s on `POST` / `PUT` / `DELETE`
 * because the public token is read-only.
 */
export function getStrapiAdminToken(): string {
  return process.env.STRAPI_ADMIN_TOKEN ?? process.env.STRAPI_API_TOKEN ?? '';
}

// Internal alias kept so existing call sites inside this file do
// not have to change. New code MUST import `getStrapiAdminToken()`
// from outside.
const TOKEN = getStrapiAdminToken();

export type AdminUserRecord = {
  id: number;
  documentId: string;
  email: string;
  name: string;
  role: 'owner' | 'client';
  active: boolean;
  passwordHash: string;
  lastLoginAt?: string;
  createdAt?: string;
  updatedAt?: string;
};

type StrapiFetchOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: string;
  headers?: Record<string, string>;
  next?: { revalidate?: number; tags?: string[] };
};

/**
 * Default headers for any request to Strapi. Strapi v5 expects
 * `application/json`; the auth header is added per-request by
 * `adminFetch` so callers can override it (e.g. when passing a
 * one-off token via `init.token`).
 */
function getStrapiHeaders(): Record<string, string> {
  return {
    Accept: 'application/json',
  };
}

async function adminFetch<T>(
  path: string,
  init: StrapiFetchOptions & { token?: string } = {}
): Promise<{ status: number; data: T | null }> {
  const token = init.token ?? TOKEN;
  if (!token) {
    throw new Error('adminFetch: STRAPI_API_TOKEN is not set');
  }
  const url = `${STRAPI}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      ...getStrapiHeaders(),
      Authorization: `Bearer ${token}`,
      ...(init.headers || {}),
    },
    cache: 'no-store',
  });
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  return { status: res.status, data: data as T | null };
}

/**
 * Look up an admin user by email via Strapi. The Strapi v5 response
 * shape wraps records in `{ data: [{...}] }` — the caller is
 * expected to look at `data.data[0]`.
 */
export async function findAdminUserByEmail(
  email: string
): Promise<AdminUserRecord | null> {
  const qs = `?filters[email][$eqi]=${encodeURIComponent(email)}&pagination[limit]=1`;
  const { status, data } = await adminFetch<{ data: AdminUserRecord[] }>(
    `/api/admin-users${qs}`
  );
  if (status !== 200 || !data?.data?.length) return null;
  return data.data[0];
}

export async function findAdminUserByDocumentId(
  documentId: string
): Promise<AdminUserRecord | null> {
  const { status, data } = await adminFetch<{ data: AdminUserRecord }>(
    `/api/admin-users/${documentId}`
  );
  if (status !== 200 || !data?.data) return null;
  return data.data;
}

export async function updateAdminUserLastLogin(
  documentId: string
): Promise<void> {
  await adminFetch(`/api/admin-users/${documentId}`, {
    method: 'PUT',
    body: JSON.stringify({ data: { lastLoginAt: new Date().toISOString() } }),
  });
}
