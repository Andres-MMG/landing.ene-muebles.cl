import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getServerSession } from "@/lib/admin/session";
import { getStrapiAdminToken } from "@/lib/admin/strapi-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const STRAPI = (process.env.STRAPI_INTERNAL_URL ?? "http://cms:1337").replace(/\/+$/, "");

/**
 * GET /api/admin/products
 *   List products for the admin. Includes drafts (so the client
 *   can see what they have submitted and what is still pending
 *   publish).
 *
 * POST /api/admin/products
 *   Create a product. The cliente cannot publish; the product is
 *   created in draft state and surfaces in the public catalog only
 *   after the owner publishes via the Strapi admin or the API.
 */

export async function GET() {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const qs = new URLSearchParams();
  qs.set("pagination[pageSize]", "100");
  qs.set("sort", "updatedAt:desc");
  qs.set("populate[category]", "true");
  qs.set("populate[images]", "true");
  qs.set("publicationState", "preview"); // include drafts
  qs.set("locale", "es");

  const res = await fetch(`${STRAPI}/api/products?${qs.toString()}`, {
    headers: { Authorization: `Bearer ${getStrapiAdminToken()}` },
    cache: "no-store",
  });
  const data = await res.json().catch(() => null);
  return NextResponse.json(data ?? { data: [] }, { status: res.status });
}

const CreateBody = z
  .object({
    name: z.string().min(1).max(120),
    slug: z.string().min(1).max(180),
    description: z.string().min(1),
    shortDescription: z.string().max(280).nullable().optional(),
    price: z.number().nonnegative(),
    currency: z.string().length(3).default("CLP"),
    category: z.union([z.number(), z.string()]).nullable().optional(),
    active: z.boolean().default(true),
    featured: z.boolean().default(false),
    externalId: z.string().max(32).nullable().optional(),
    productType: z
      .enum(["Silla", "Mesa", "Escritorio", "Banca", "Piso", "Cuna"])
      .nullable()
      .optional(),
    subcategory: z.string().max(80).nullable().optional(),
    usageEnvironment: z.string().max(120).nullable().optional(),
    observableColor: z.string().max(120).nullable().optional(),
    observableMaterial: z.string().max(160).nullable().optional(),
    catalogPage: z.number().int().min(1).nullable().optional(),
    confidence: z
      .enum([
        "alta",
        "media-variante-visual",
        "media-nombre-generico-pdf",
        "baja",
        "revision-manual",
      ])
      .nullable()
      .optional(),
    source: z.string().max(200).nullable().optional(),
    observation: z.string().max(10000).nullable().optional(),
  })
  .strict();

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: z.infer<typeof CreateBody>;
  try {
    body = CreateBody.parse(await req.json());
  } catch (err) {
    return NextResponse.json({ error: "Datos inválidos", details: String(err) }, { status: 400 });
  }

  // Strapi v5 expects the category as a relation id. The admin
  // sends either a numeric id or a documentId; we coerce both to
  // the numeric id that the REST API accepts. A documentId that
  // does not resolve is a hard client error — never silently drop it.
  let categoryId: number | undefined;
  if (typeof body.category === "number") categoryId = body.category;
  else if (typeof body.category === "string") {
    const lookup = await fetch(
      `${STRAPI}/api/categories?filters[documentId][$eq]=${body.category}&pagination[limit]=1`,
      { headers: { Authorization: `Bearer ${getStrapiAdminToken()}` } },
    );
    const json = (await lookup.json().catch(() => null)) as { data: { id: number }[] } | null;
    categoryId = json?.data?.[0]?.id;
    if (categoryId === undefined) {
      return NextResponse.json(
        { error: `Categoría no encontrada: ${body.category}` },
        { status: 400 },
      );
    }
  }

  const data: Record<string, unknown> = { ...body };
  if (categoryId === undefined) delete data.category;
  else data.category = categoryId;

  const res = await fetch(`${STRAPI}/api/products`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getStrapiAdminToken()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      // publishedAt is intentionally omitted. The product starts as a draft.
      data,
    }),
    cache: "no-store",
  });
  const jsonResponse = await res.json().catch(() => null);
  return NextResponse.json(jsonResponse, { status: res.status });
}
