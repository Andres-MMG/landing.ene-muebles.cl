import { NextResponse, type NextRequest } from "next/server";
import { getStrapiAdminToken, readAdminLeads } from "@/lib/admin/strapi-admin";
import { requireAdmin, strapiAuthFailure } from "@/lib/admin/require-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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
  const user = await requireAdmin().catch(() => undefined);
  if (user === undefined) return strapiAuthFailure();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await readAdminLeads(new URL(req.url).searchParams, getStrapiAdminToken());
  return NextResponse.json(result.data, { status: result.status });
}
