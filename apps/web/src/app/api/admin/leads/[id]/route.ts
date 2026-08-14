import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getStrapiAdminToken } from "@/lib/admin/strapi-admin";
import { requireAdmin, strapiAuthFailure } from "@/lib/admin/require-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const STRAPI = (process.env.STRAPI_INTERNAL_URL ?? "http://cms:1337").replace(/\/+$/, "");

/**
 * PATCH /api/admin/leads/[id]
 *   Move a lead through its lifecycle: new → notified (marcado
 *   gestionado) or back to new (reabrir). Status is the only mutable
 *   field — the lead's own data is written by the public contact form
 *   and must stay untouched.
 *
 * DELETE /api/admin/leads/[id]
 *   Remove a lead from the inbox. Strapi answers 204 on success; we
 *   normalize that to 200 so the admin client only deals with one
 *   success shape.
 */

const PatchBody = z.object({ status: z.enum(["new", "notified", "failed"]) }).strict();

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  // Guard: valid session AND the admin user still exists and is active.
  const user = await requireAdmin();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  let body: z.infer<typeof PatchBody>;
  try {
    body = PatchBody.parse(await req.json());
  } catch (err) {
    return NextResponse.json({ error: "Datos inválidos", details: String(err) }, { status: 400 });
  }

  const res = await fetch(`${STRAPI}/api/leads/${id}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${getStrapiAdminToken()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ data: body }),
    cache: "no-store",
  });
  // Strapi-side 401 = broken admin token, not the admin's own session
  // (that already passed requireAdmin above). Forwarding it would log
  // out a healthy admin, so surface it as a gateway error instead.
  if (res.status === 401) {
    return strapiAuthFailure();
  }
  const json = await res.json().catch(() => null);
  return NextResponse.json(json, { status: res.status });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  // Guard: valid session AND the admin user still exists and is active.
  const user = await requireAdmin();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const res = await fetch(`${STRAPI}/api/leads/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${getStrapiAdminToken()}` },
    cache: "no-store",
  });
  // Strapi-side 401 = broken admin token, not the admin's own session.
  if (res.status === 401) {
    return strapiAuthFailure();
  }
  // 204 = deleted, 200 = also OK in Strapi v5 sometimes. Normalize.
  return new NextResponse(null, { status: res.status === 204 ? 200 : res.status });
}
