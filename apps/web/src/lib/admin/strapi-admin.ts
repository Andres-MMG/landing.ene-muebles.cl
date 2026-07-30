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
 *   - uploadProductImages
 *   - reorderProductImages
 *   - deleteMedia
 *   - listAdminCategories
 *   - getAdminCategory
 *   - createAdminCategory
 *   - updateAdminCategory
 *   - deleteAdminCategory
 *   - getAdminSiteSetting
 *   - updateAdminSiteSetting
 */

const STRAPI = (process.env.STRAPI_INTERNAL_URL ?? 'http://cms:1337').replace(/\/+$/, '');

/**
 * Single source of truth for the Strapi admin-scoped API token used
 * by every `/api/admin/*` Next.js route handler. Precedence:
 *
 *   1. `STRAPI_ADMIN_TOKEN` (full-access, admin scope)
 *   2. `STRAPI_API_TOKEN` (legacy fallback; it must permit admin writes)
 *   3. empty string (never undefined; adminFetch rejects writes and direct
 *      proxy routes receive an empty Authorization header that Strapi rejects)
 *
 * Route handlers MUST import this function instead of reading
 * `process.env.STRAPI_*` directly. Reading the env var directly
 * bypasses the fallback and causes 401s on `POST` / `PUT` / `DELETE`
 * when only `STRAPI_API_TOKEN` is configured.
 */
export function getStrapiAdminToken(): string {
  return process.env.STRAPI_ADMIN_TOKEN || process.env.STRAPI_API_TOKEN || '';
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

export type AdminCategory = {
  id: number;
  documentId: string;
  name: string;
  slug: string;
  description?: string;
  image?: {
    id: number;
    documentId: string;
    url: string;
    thumbnailUrl?: string;
    name: string;
  } | null;
  order: number;
  active: boolean;
};

export type AdminSiteSetting = {
  brandName?: string;
  tagline?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  socialInstagram?: string;
  socialFacebook?: string;
  socialLinkedIn?: string;
  heroTitle?: string;
  heroSubtitle?: string;
  footerCopy?: string;
};

type StrapiFetchBody = string | FormData;

type StrapiFetchOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: StrapiFetchBody;
  headers?: Record<string, string>;
  next?: { revalidate?: number; tags?: string[] };
};

/**
 * Default headers for any request to Strapi. Strapi v5 expects
 * `application/json`; the auth header is added per-request by
 * `adminFetch` so callers can override it (e.g. when passing a
 * one-off token via `init.token`).
 *
 * `Content-Type` is only added when the caller passes a string body
 * (JSON). When the body is a `FormData` (file upload), the browser
 * / `fetch` runtime sets the multipart boundary itself; setting a
 * JSON `Content-Type` here would break the upload.
 */
function getStrapiHeaders(body?: StrapiFetchBody): Record<string, string> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (typeof body === 'string') headers['Content-Type'] = 'application/json';
  return headers;
}

async function adminFetch<T>(
  path: string,
  init: StrapiFetchOptions & { token?: string } = {}
): Promise<{ status: number; data: T | null }> {
  const token = init.token ?? TOKEN;
  if (!token) {
    throw new Error('adminFetch: STRAPI_ADMIN_TOKEN or STRAPI_API_TOKEN is not set');
  }
  const url = `${STRAPI}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      ...getStrapiHeaders(init.body),
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

/**
 * Upload one or more images to a product. Strapi v5 accepts
 * multipart `files` plus `ref` (UID) / `refId` (documentId) / `field`
 * to bind the media on attach. The caller has already validated
 * size and MIME.
 *
 * Returns Strapi's raw payload (`[{ id, documentId, url, ... }]`)
 * wrapped in `{ status, data }`.
 */
export async function uploadProductImages(
  productDocumentId: string,
  files: File[]
): Promise<{ status: number; data: unknown }> {
  const form = new FormData();
  for (const f of files) form.append('files', f);
  form.append('ref', 'api::product.product');
  form.append('refId', productDocumentId);
  form.append('field', 'images');
  return adminFetch('/api/upload', { method: 'POST', body: form });
}

/**
 * Reorder a product's images. Strapi v5 stores order on the relation
 * row, so we PUT `images: { set: [id1, id2, ...] }` on the product
 * entry. `imageIds` are the numeric media ids in the desired order.
 */
export async function reorderProductImages(
  productDocumentId: string,
  imageIds: number[]
): Promise<{ status: number; data: unknown }> {
  return adminFetch(`/api/products/${productDocumentId}`, {
    method: 'PUT',
    body: JSON.stringify({ data: { images: { set: imageIds } } }),
  });
}

/**
 * Delete a single media file from Strapi's Media Library. Returns
 * the HTTP status only (204 on success).
 */
export async function deleteMedia(mediaId: number): Promise<{ status: number }> {
  const { status } = await adminFetch(`/api/upload/files/${mediaId}`, {
    method: 'DELETE',
  });
  return { status };
}

/**
 * List every category (drafts included). Caller may filter by
 * `populate=products.count` if it needs the product count.
 */
export async function listAdminCategories(): Promise<AdminCategory[]> {
  const { status, data } = await adminFetch<{ data: AdminCategory[] }>(
    '/api/categories?pagination[pageSize]=100&sort=order:asc&populate=image'
  );
  if (status !== 200) return [];
  return data?.data ?? [];
}

export async function getAdminCategory(
  documentId: string
): Promise<AdminCategory | null> {
  const { status, data } = await adminFetch<{ data: AdminCategory }>(
    `/api/categories/${documentId}?populate=image`
  );
  if (status !== 200) return null;
  return data?.data ?? null;
}

export async function createAdminCategory(payload: {
  name: string;
  slug: string;
  description?: string;
  order: number;
  active: boolean;
}): Promise<{ status: number; data: AdminCategory | null }> {
  const { status, data } = await adminFetch<{ data: AdminCategory }>(
    '/api/categories',
    {
      method: 'POST',
      body: JSON.stringify({ data: payload }),
    }
  );
  return { status, data: data?.data ?? null };
}

export async function updateAdminCategory(
  documentId: string,
  payload: Partial<
    Pick<AdminCategory, 'name' | 'slug' | 'description' | 'order' | 'active'>
  >
): Promise<{ status: number; data: AdminCategory | null }> {
  const { status, data } = await adminFetch<{ data: AdminCategory }>(
    `/api/categories/${documentId}`,
    {
      method: 'PUT',
      body: JSON.stringify({ data: payload }),
    }
  );
  return { status, data: data?.data ?? null };
}

export async function deleteAdminCategory(
  documentId: string
): Promise<{ status: number }> {
  const { status } = await adminFetch(`/api/categories/${documentId}`, {
    method: 'DELETE',
  });
  return { status };
}

/**
 * Read the `site-setting` singleton. Returns `null` when Strapi has
 * no record yet (singleType has no document ID).
 */
export async function getAdminSiteSetting(): Promise<AdminSiteSetting | null> {
  const { status, data } = await adminFetch<{
    data: AdminSiteSetting | null;
  }>('/api/site-setting?populate=*');
  if (status !== 200) return null;
  return (data?.data as AdminSiteSetting | null) ?? null;
}

export async function updateAdminSiteSetting(
  payload: AdminSiteSetting
): Promise<{ status: number; data: AdminSiteSetting | null }> {
  const { status, data } = await adminFetch<{ data: AdminSiteSetting }>(
    '/api/site-setting',
    {
      method: 'PUT',
      body: JSON.stringify({ data: payload }),
    }
  );
  return { status, data: data?.data ?? null };
}
