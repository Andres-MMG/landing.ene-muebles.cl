import { NextResponse, type NextRequest } from "next/server";
import { getStrapiAdminToken } from "@/lib/admin/strapi-admin";
import { requireAdmin, strapiAuthFailure } from "@/lib/admin/require-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const STRAPI = (process.env.STRAPI_INTERNAL_URL ?? "http://cms:1337").replace(/\/+$/, "");

const LEAD_STATUSES = ["new", "notified", "failed"] as const;

/**
 * GET /api/admin/leads
 *   List contact-form leads for the admin inbox. Read-only: lead
 *   lifecycle mutations go through PATCH/DELETE `/api/admin/leads/[id]`.
 *
 * Query params:
 *   - page / pageSize (pageSize defaults to 50, clamped to 1..100)
 *   - status          (new | notified | failed; anything else → 400)
 *   - q               (contains-insensitive search across name, email
 *                     and institution via Strapi `$containsi` filters)
 *
 * Sorting is always `createdAt:desc` (newest first) and the Strapi
 * `{ data, meta }` envelope is passed through untouched. No
 * revalidateTag: leads are private admin data and are never part of
 * the public-site cache.
 */

export async function GET(req: NextRequest) {
  // Guard: valid session AND the admin user still exists and is active
  // (mirrors the (authenticated) layout check).
  const user = await requireAdmin();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = new URL(req.url).searchParams;
  const qs = new URLSearchParams();

  const rawPage = Number.parseInt(params.get("page") ?? "1", 10);
  const page = Number.isFinite(rawPage) && rawPage >= 1 ? rawPage : 1;
  const rawPageSize = Number.parseInt(params.get("pageSize") ?? "50", 10);
  const pageSize = Number.isFinite(rawPageSize) ? Math.min(Math.max(rawPageSize, 1), 100) : 50;
  qs.set("pagination[page]", String(page));
  qs.set("pagination[pageSize]", String(pageSize));

  const status = params.get("status");
  if (status) {
    if (!(LEAD_STATUSES as readonly string[]).includes(status)) {
      return NextResponse.json({ error: `Status inválido: ${status}` }, { status: 400 });
    }
    qs.set("filters[status][$eq]", status);
  }

  const q = params.get("q");
  if (q) {
    qs.set("filters[$or][0][name][$containsi]", q);
    qs.set("filters[$or][1][email][$containsi]", q);
    qs.set("filters[$or][2][institution][$containsi]", q);
  }

  qs.set("sort", "createdAt:desc");

  const res = await fetch(`${STRAPI}/api/leads?${qs.toString()}`, {
    headers: { Authorization: `Bearer ${getStrapiAdminToken()}` },
    cache: "no-store",
  });
  // Strapi-side 401 = broken admin token, not the admin's own session
  // (that already passed requireAdmin above). Forwarding it would log
  // out a healthy admin, so surface it as a gateway error instead.
  if (res.status === 401) {
    return strapiAuthFailure();
  }
  const data = await res.json().catch(() => null);
  // Keep the { data, meta } envelope shape even when Strapi's body is
  // unparseable so the admin client always gets a consistent contract.
  return NextResponse.json(
    data ?? {
      data: [],
      meta: { pagination: { page, pageSize, pageCount: 0, total: 0 } },
    },
    { status: res.status },
  );
}
