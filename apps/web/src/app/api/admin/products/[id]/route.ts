import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getServerSession } from "@/lib/admin/session";
import { getStrapiAdminToken } from "@/lib/admin/strapi-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const STRAPI = (process.env.STRAPI_INTERNAL_URL ?? "http://cms:1337").replace(/\/+$/, "");

/**
 * PATCH /api/admin/products/[id]
 *   Update fields on a product. The cliente can edit name,
 *   description, price, active/featured, but NOT publish state
 *   (publish state is reserved for the owner / Strapi admin).
 *
 * DELETE /api/admin/products/[id]
 *   Delete a product. Same restriction: cliente can delete their
 *   own drafts; owner has the final say via the Strapi admin.
 */

const PatchBody = z
  .object({
    name: z.string().min(1).max(120).optional(),
    slug: z.string().min(1).max(180).optional(),
    description: z.string().min(1).optional(),
    shortDescription: z.string().max(280).optional(),
    price: z.number().nonnegative().optional(),
    currency: z.string().length(3).optional(),
    category: z.union([z.number(), z.string()]).optional(),
    active: z.boolean().optional(),
    featured: z.boolean().optional(),
    externalId: z.string().max(32).optional(),
    productType: z.enum(["Silla", "Mesa", "Escritorio", "Banca", "Piso", "Cuna"]).optional(),
    subcategory: z.string().max(80).optional(),
    usageEnvironment: z.string().max(120).optional(),
    observableColor: z.string().max(120).optional(),
    observableMaterial: z.string().max(160).optional(),
    catalogPage: z.number().int().min(1).optional(),
    confidence: z
      .enum([
        "alta",
        "media-variante-visual",
        "media-nombre-generico-pdf",
        "baja",
        "revision-manual",
      ])
      .optional(),
    source: z.string().max(200).optional(),
    observation: z.string().max(10000).optional(),
  })
  .strict();

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  let body: z.infer<typeof PatchBody>;
  try {
    body = PatchBody.parse(await req.json());
  } catch (err) {
    return NextResponse.json({ error: "Datos inválidos", details: String(err) }, { status: 400 });
  }

  // Resolve the category relation if provided as documentId.
  let categoryId: number | undefined;
  if (typeof body.category === "string" && body.category) {
    const lookup = await fetch(
      `${STRAPI}/api/categories?filters[documentId][$eq]=${body.category}&pagination[limit]=1`,
      { headers: { Authorization: `Bearer ${getStrapiAdminToken()}` } },
    );
    const json = await lookup.json().catch(() => null);
    categoryId = json?.data?.[0]?.id;
  } else if (typeof body.category === "number") {
    categoryId = body.category;
  }

  // Build the patch payload. If the category was provided as a
  // documentId we resolved it above; if the caller passed a numeric
  // id we use it directly. If neither, leave the field off the
  // payload so Strapi does not touch it.
  const data: Record<string, unknown> = { ...body };
  if ("category" in data) {
    if (categoryId === undefined) {
      delete data.category;
    } else {
      data.category = categoryId;
    }
  }

  const res = await fetch(`${STRAPI}/api/products/${id}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${getStrapiAdminToken()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ data }),
    cache: "no-store",
  });
  const json = await res.json().catch(() => null);
  return NextResponse.json(json, { status: res.status });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const res = await fetch(`${STRAPI}/api/products/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${getStrapiAdminToken()}` },
    cache: "no-store",
  });
  // 204 = deleted, 200 = also OK in Strapi v5 sometimes. Pass through.
  return new NextResponse(null, { status: res.status === 204 ? 200 : res.status });
}
