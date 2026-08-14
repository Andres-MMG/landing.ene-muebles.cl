/**
 * Data access for the admin Leads inbox.
 *
 * Split between two worlds on purpose:
 *   - `fetchLeads` runs ONLY on the server (the page component). A
 *     server `fetch` does NOT carry the browser session cookie, so the
 *     caller must forward it explicitly via `opts.cookie` (from
 *     `cookies()` in `next/headers`) — otherwise `/api/admin/leads`
 *     answers 401. On 401 it throws a typed
 *     `LeadFetchUnauthorizedError` and the page turns that into a
 *     `redirect()` — server-side there is no `window` to navigate, so
 *     the inline `window.location.assign` guard must NOT run here.
 *   - `updateLeadStatus` / `deleteLead` run ONLY on the client (the
 *     `LeadsList` component) and talk to the admin API routes with the
 *     browser's own credentials. Those keep the inlined 401 →
 *     `/admin/login?expired=1` guard (same semantics as
 *     `assertAdminAuth`, but guarded with `typeof window !==
 *     "undefined"` because this module MUST NOT import the client-only
 *     admin helpers module — it carries a client directive, which
 *     would poison this file for the server component).
 */

export type LeadStatus = "new" | "notified" | "failed";

/**
 * Distinguishable error for a 401 from `/api/admin/leads`. The page
 * component catches this type specifically to redirect to the login
 * route; any other failure renders the in-page error state instead.
 */
export class LeadFetchUnauthorizedError extends Error {
  constructor() {
    super("Unauthorized");
    this.name = "LeadFetchUnauthorizedError";
  }
}

export type Lead = {
  id: number;
  documentId: string;
  name: string;
  institution?: string | null;
  email: string;
  phone?: string | null;
  region?: string | null;
  message?: string | null;
  consent: boolean;
  consentVersion?: string | null;
  source?: string | null;
  product?: string | null;
  status: LeadStatus;
  idempotencyKey?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type LeadListParams = {
  page?: number;
  pageSize?: number;
  status?: LeadStatus | "";
  q?: string;
};

export type LeadPagination = {
  page: number;
  pageSize: number;
  pageCount: number;
  total: number;
};

export type LeadListResult = {
  leads: Lead[];
  pagination: LeadPagination;
};

export const LEAD_PAGE_SIZE = 50;

const FALLBACK_PAGINATION: LeadPagination = {
  page: 1,
  pageSize: LEAD_PAGE_SIZE,
  pageCount: 0,
  total: 0,
};

/** Pure query-string builder for `/api/admin/leads`. Defaults produce "". */
export function buildLeadsQuery(params: LeadListParams): string {
  const qs = new URLSearchParams();
  if (params.page && params.page > 1) qs.set("page", String(params.page));
  if (params.pageSize && params.pageSize !== LEAD_PAGE_SIZE) {
    qs.set("pageSize", String(params.pageSize));
  }
  if (params.status) qs.set("status", params.status);
  if (params.q) qs.set("q", params.q);
  return qs.toString();
}

function redirectToLoginIfExpired(res: Response): void {
  if (res.status === 401 && typeof window !== "undefined") {
    window.location.assign("/admin/login?expired=1");
  }
}

/**
 * Server-side fetch of one leads page. Pass `opts.cookie` with the
 * full browser cookie string (from `cookies()`) and `opts.baseUrl`
 * with the public origin the admin browser is on
 * (`NEXT_PUBLIC_SITE_URL`); the API route guards on the session
 * cookie, which plain server `fetch` would otherwise omit.
 */
export async function fetchLeads(
  params: LeadListParams,
  opts: { baseUrl?: string; cookie?: string } = {},
): Promise<LeadListResult> {
  const base = (opts.baseUrl ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(
    /\/+$/,
    "",
  );
  const query = buildLeadsQuery(params);
  const res = await fetch(`${base}/api/admin/leads${query ? `?${query}` : ""}`, {
    headers: opts.cookie ? { cookie: opts.cookie } : undefined,
    cache: "no-store",
  });
  if (res.status === 401) {
    // Server-side, the window-location redirect branch is dead code
    // (no `window` exists here). Throw the typed error and let the
    // page decide how to respond (redirect vs. error state). The
    // client mutations below still use redirectToLoginIfExpired.
    throw new LeadFetchUnauthorizedError();
  }
  if (!res.ok) {
    throw new Error(`No se pudieron cargar los leads (${res.status}).`);
  }
  const envelope = (await res.json().catch(() => null)) as {
    data?: Lead[];
    meta?: { pagination?: LeadPagination };
  } | null;
  if (!envelope?.data) {
    throw new Error("Respuesta inválida del servidor de leads.");
  }
  return {
    leads: envelope.data,
    pagination: envelope.meta?.pagination ?? {
      ...FALLBACK_PAGINATION,
      page: params.page ?? 1,
      pageSize: params.pageSize ?? LEAD_PAGE_SIZE,
    },
  };
}

/** Client-side: PATCH the lead status (new ↔ notified, or failed). */
export async function updateLeadStatus(
  documentId: string,
  status: LeadStatus,
): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(`/api/admin/leads/${documentId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
    credentials: "same-origin",
  });
  redirectToLoginIfExpired(res);
  if (res.ok) return { ok: true };
  const data = (await res.json().catch(() => null)) as { error?: string } | null;
  return { ok: false, error: data?.error ?? "No se pudo actualizar el lead." };
}

/** Client-side: DELETE a lead from the inbox. */
export async function deleteLead(
  documentId: string,
): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(`/api/admin/leads/${documentId}`, {
    method: "DELETE",
    credentials: "same-origin",
  });
  redirectToLoginIfExpired(res);
  if (res.ok) return { ok: true };
  const data = (await res.json().catch(() => null)) as { error?: string } | null;
  return { ok: false, error: data?.error ?? "No se pudo eliminar el lead." };
}
