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

import type { SocialLinks, StrapiMedia } from '@/lib/strapi';
import type { ImportBatch, ProductImportSource } from '@/lib/strapi';

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

/**
 * Catalog-import (S2b) — admin-scoped Product shape that includes the
 * traceability fields (`importSource`, `importBatch`). Mirrors the
 * public `Product` type but is exported separately so admin payloads
 * can grow without touching public read paths.
 */
export type AdminProduct = {
  id: number;
  documentId: string;
  name: string;
  slug: string;
  externalId?: string;
  productType?: string;
  confidence?: string;
  importSource?: ProductImportSource;
  importBatch?: Pick<ImportBatch, 'id' | 'documentId' | 'fileName' | 'uploadedAt'> | null;
};

export type AdminSiteSetting = {
  siteName?: string;
  tagline?: string;
  contactEmail?: string;
  contactPhone?: string;
  whatsappNumber?: string;
  whatsappDefaultMessage?: string;
  address?: string;
  socialLinks?: SocialLinks;
  businessHours?: string;
  aboutText?: string;
  rut?: string;
  heroImage?: StrapiMedia | null;
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
    throw new Error('adminFetch: STRAPI_API_TOKEN is not set');
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
export async function listAdminImportBatches(): Promise<ImportBatch[]> {
  const qs = '?pagination[pageSize]=100&sort=uploadedAt:desc';
  const { status, data } = await adminFetch<{ data: ImportBatch[] }>(
    `/api/import-batches${qs}`
  );
  if (status !== 200 || !data?.data) return [];
  return data.data;
}

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

// ---------------------------------------------------------------------------
// Catalog import (S2) — bulk upsert endpoint helpers.
//
// The route handler at `/api/admin/products/import` calls these helpers
// inside a per-request closure built by `createImportScope()`. The closure
// owns the dedup caches; the route creates one scope per request so the
// caches live exactly as long as a single batch (no global state, no
// stale reads across admin sessions).
// ---------------------------------------------------------------------------

/** Row shape the route accepts in `items[]`. `values` mirrors the
 *  output of `mapExcelRowToProduct`; `categoryName` is the Excel
 *  `Categoría` column (separated out so it can be resolved against
 *  the Category content type, not stored as a string on Product). */
export type ImportRow = {
  values: {
    externalId?: string;
    name?: string;
    slug?: string;
    description?: string;
    shortDescription?: string;
    price?: number;
    productType?: string;
    subcategory?: string;
    usageEnvironment?: string;
    observableColor?: string;
    observableMaterial?: string;
    catalogPage?: number;
    confidence?:
      | 'alta'
      | 'media-variante-visual'
      | 'media-nombre-generico-pdf'
      | 'revision-manual';
    source?: string;
    observation?: string;
  };
  warnings?: string[];
  categoryName?: string;
  sourceIndex?: number;
};

/** Per-row outcome. `documentId` is set on success; `error` carries
 *  the upstream Strapi message on failure. `index` is the original row
 *  index supplied by the admin client when available. `importSource`
 *  is included so the admin UI can show a badge in the post-import
 *  summary (S2b). */
export type RowResult = {
  index: number;
  documentId?: string;
  error?: string;
  warnings?: string[];
  importSource?: 'imported';
};

/** Batch summary returned to the client. `batch` is added in S2b and
 *  carries the documentId of the `ImportBatch` audit-trail record. */
export type ImportResponse = {
  created: RowResult[];
  updated: RowResult[];
  failed: RowResult[];
  batch?: {
    documentId: string;
  };
};

/** Alias kept for symmetry with the design.md type table. */
export type ImportResult = RowResult;

/** Result of `resolveOrCreateCategory` / `resolveOrCreateSubcategory`. */
export type CategoryLookup = {
  documentId: string;
  created: boolean;
};

/** S2b — counters written back to an `ImportBatch` after the row-level
 *  pipeline completes. Numeric IDs are Strapi's primary key on the
 *  `products` collection (different from `documentId`). */
export type BatchCounters = {
  totalRows: number;
  createdCount: number;
  updatedCount: number;
  failedCount: number;
  importedProductIds: number[];
};

/** Public surface of one request-scoped import scope. Created by
 *  `createImportScope()` and consumed by the import route handler. */
export type ImportScope = {
  /** Resolve (or auto-create) a category by name. Case/accent-insensitive. */
  resolveOrCreateCategory(name: string): Promise<CategoryLookup>;
  /** Resolve (or auto-create) a subcategory by name, scoped to a parent
   *  category. Cache key is `${name}|${categoryName}` so two
   *  subcategories with the same name under different parents stay
   *  distinct (matches the spec's `subcategory + categoryName` key). */
  resolveOrCreateSubcategory(args: {
    name: string;
    categoryName: string;
  }): Promise<CategoryLookup>;
  /** Look up a single product by externalId. Returns `null` when the
   *  product doesn't exist (Strapi returns 200 with empty data). */
  findProductByExternalId(externalId: string): Promise<string | null>;
  /** S2b — create the audit-trail record that ties the whole batch
   *  together. Must be called exactly once before the row loop runs.
   *  Returns the batch `documentId` so the route can embed it in
   *  every per-row product write. */
  createImportBatch(input: {
    fileName: string;
    uploadedByEmail?: string;
    totalRows: number;
  }): Promise<string>;
  /** S2b — update the batch with the actual counters after the row
   *  loop finishes. Idempotent: calling it twice with the same input
   *  produces the same end state. */
  recordBatchCounters(documentId: string, counters: BatchCounters): Promise<void>;
};

/** Lowercase / strip accents / collapse non-alphanumerics to `-`. */
function importSlugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Build a request-scoped import resolver. The route handler MUST
 * call this once per request — never share scopes across requests,
 * never cache at module level. The returned object's methods share a
 * private Map so within a single batch the same category name only
 * triggers one GET + (at most) one POST, regardless of how many rows
 * reference it.
 *
 * `getToken` MUST be the `getStrapiAdminToken` reference imported at
 * the call site (the route). Passing it through explicitly is what
 * lets tests mock the token at the import boundary — internal calls
 * to `getStrapiAdminToken` from inside this module would resolve to
 * the un-mocked original.
 */
export function createImportScope(getToken: () => string): ImportScope {
  const categoryCache = new Map<string, CategoryLookup>();
  const subcategoryCache = new Map<string, CategoryLookup>();

  async function resolveOrCreateCategory(name: string): Promise<CategoryLookup> {
    const cached = categoryCache.get(name);
    if (cached) return cached;
    const { status, data } = await adminFetch<{
      data?: Array<{ documentId?: string }>;
    }>(
      `/api/categories?filters[name][$eqi]=${encodeURIComponent(name)}&pagination[limit]=1`,
      { token: getToken() }
    );
    const existing = status === 200 ? data?.data?.[0]?.documentId : null;
    if (existing) {
      const result: CategoryLookup = { documentId: existing, created: false };
      categoryCache.set(name, result);
      return result;
    }
    const { status: cs, data: cd } = await adminFetch<{
      data?: { documentId?: string };
    }>('/api/categories', {
      method: 'POST',
      token: getToken(),
      body: JSON.stringify({
        data: { name, slug: importSlugify(name), order: 0, active: true },
      }),
    });
    const docId = cs < 400 ? cd?.data?.documentId ?? null : null;
    const result: CategoryLookup = { documentId: docId ?? '', created: Boolean(docId) };
    categoryCache.set(name, result);
    return result;
  }

  async function resolveOrCreateSubcategory(args: {
    name: string;
    categoryName: string;
  }): Promise<CategoryLookup> {
    const key = `${args.name}|${args.categoryName}`;
    const cached = subcategoryCache.get(key);
    if (cached) return cached;
    const { status, data } = await adminFetch<{
      data?: Array<{ documentId?: string }>;
    }>(
      `/api/subcategories?filters[name][$eqi]=${encodeURIComponent(args.name)}&pagination[limit]=1`,
      { token: getToken() }
    );
    const existing = status === 200 ? data?.data?.[0]?.documentId : null;
    if (existing) {
      const result: CategoryLookup = { documentId: existing, created: false };
      subcategoryCache.set(key, result);
      return result;
    }
    // Parent category may also be missing → auto-created as a side-effect.
    let parentDocumentId: string | undefined;
    if (args.categoryName) {
      const cat = await resolveOrCreateCategory(args.categoryName);
      parentDocumentId = cat.documentId || undefined;
    }
    const { status: ss, data: sd } = await adminFetch<{
      data?: { documentId?: string };
    }>('/api/subcategories', {
      method: 'POST',
      token: getToken(),
      body: JSON.stringify({
        data: {
          name: args.name,
          slug: importSlugify(args.name),
          ...(parentDocumentId ? { category: parentDocumentId } : {}),
        },
      }),
    });
    const docId = ss < 400 ? sd?.data?.documentId ?? null : null;
    const result: CategoryLookup = { documentId: docId ?? '', created: Boolean(docId) };
    subcategoryCache.set(key, result);
    return result;
  }

  async function findProductByExternalId(
    externalId: string
  ): Promise<string | null> {
    const { status, data } = await adminFetch<{
      data?: Array<{ documentId?: string }>;
    }>(
      `/api/products?filters[externalId][$eq]=${encodeURIComponent(externalId)}&pagination[limit]=1`,
      { token: getToken() }
    );
    if (status !== 200) return null;
    return data?.data?.[0]?.documentId ?? null;
  }

  /** S2b — POST /api/import-batches. Returns the new batch `documentId`. */
  async function createImportBatch(input: {
    fileName: string;
    uploadedByEmail?: string;
    totalRows: number;
  }): Promise<string> {
    const payload: Record<string, unknown> = {
      fileName: input.fileName,
      uploadedAt: new Date().toISOString(),
      importSource: 'imported',
      totalRows: input.totalRows,
    };
    if (input.uploadedByEmail) payload.uploadedByEmail = input.uploadedByEmail;
    const { status, data } = await adminFetch<{
      data?: { documentId?: string };
    }>('/api/import-batches', {
      method: 'POST',
      token: getToken(),
      body: JSON.stringify({ data: payload }),
    });
    if (status >= 400 || !data?.data?.documentId) {
      throw new Error(
        `createImportBatch failed: Strapi returned ${status} ${JSON.stringify(data)}`
      );
    }
    return data.data.documentId;
  }

  /** S2b — PUT /api/import-batches/:documentId with the row-loop counters. */
  async function recordBatchCounters(
    documentId: string,
    counters: BatchCounters
  ): Promise<void> {
    const { status, data } = await adminFetch<unknown>(
      `/api/import-batches/${documentId}`,
      {
        method: 'PUT',
        token: getToken(),
        body: JSON.stringify({
          data: {
            totalRows: counters.totalRows,
            createdCount: counters.createdCount,
            updatedCount: counters.updatedCount,
            failedCount: counters.failedCount,
            importedProductIds: counters.importedProductIds,
          },
        }),
      }
    );
    if (status >= 400) {
      throw new Error(
        `recordBatchCounters failed: Strapi returned ${status} ${JSON.stringify(data)}`
      );
    }
  }

  return {
    resolveOrCreateCategory,
    resolveOrCreateSubcategory,
    findProductByExternalId,
    createImportBatch,
    recordBatchCounters,
  };
}
