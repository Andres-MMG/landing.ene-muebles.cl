import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { revalidateTag } from 'next/cache';
import { getServerSession } from '@/lib/admin/session';
import { getStrapiAdminToken } from '@/lib/admin/strapi-admin';
import { STRAPI_CACHE_TAGS } from '@/lib/strapi';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const STRAPI = (process.env.STRAPI_INTERNAL_URL ?? 'http://cms:1337').replace(
  /\/+$/,
  ''
);

/**
 * GET    /api/admin/categories/[id]
 *   Read one category (with image populated).
 *
 * PUT    /api/admin/categories/[id]
 *   Update one or more fields.
 *
 * DELETE /api/admin/categories/[id]
 *   Delete the category. If the category still has products we
 *   return 409 so the UI can prompt the admin to reassign them.
 */

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  const res = await fetch(
    `${STRAPI}/api/categories/${id}?populate=image`,
    {
      headers: { Authorization: `Bearer ${getStrapiAdminToken()}` },
      cache: 'no-store',
    }
  );
  const data = await res.json().catch(() => null);
  return NextResponse.json(data, { status: res.status });
}

const PatchBody = z
  .object({
    name: z.string().min(1).max(80).optional(),
    slug: z
      .string()
      .min(1)
      .max(80)
      .regex(/^[a-z0-9-]+$/, 'slug inválido')
      .optional(),
    description: z.string().max(500).optional(),
    order: z.number().int().nonnegative().optional(),
    active: z.boolean().optional(),
    image: z.union([z.number(), z.null()]).optional(),
  })
  .strict();

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;

  let body: z.infer<typeof PatchBody>;
  try {
    body = PatchBody.parse(await req.json());
  } catch (err) {
    return NextResponse.json(
      { error: 'Datos inválidos', details: String(err) },
      { status: 400 }
    );
  }

  const res = await fetch(`${STRAPI}/api/categories/${id}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${getStrapiAdminToken()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ data: body }),
    cache: 'no-store',
  });
  const data = await res.json().catch(() => null);
  // ISR milestone: category edits surface on home/category pages —
  // purge catalog-tagged fetches on success.
  if (res.ok) revalidateTag(STRAPI_CACHE_TAGS.catalog, { expire: 0 });
  return NextResponse.json(data, { status: res.status });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;

  // Block deletion when the category still has products so we don't
  // orphan their `category` relation. Strapi itself would allow it
  // (the relation column becomes NULL), but the dashboard UX
  // requires a 409 so the admin can reassign first.
  const check = await fetch(
    `${STRAPI}/api/categories/${id}?populate[products][count]=true&populate[products][fields][0]=id`,
    {
      headers: { Authorization: `Bearer ${getStrapiAdminToken()}` },
      cache: 'no-store',
    }
  );
  if (check.ok) {
    const json = (await check.json().catch(() => null)) as {
      data?: { products?: unknown[] };
    } | null;
    const productCount = Array.isArray(json?.data?.products)
      ? json!.data!.products!.length
      : 0;
    if (productCount > 0) {
      return NextResponse.json(
        {
          error:
            'Esta categoría tiene productos asociados. Reasignalos antes de eliminar.',
        },
        { status: 409 }
      );
    }
  }

  const res = await fetch(`${STRAPI}/api/categories/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${getStrapiAdminToken()}` },
    cache: 'no-store',
  });
  // ISR milestone: a deleted category must leave public pages
  // immediately — purge catalog-tagged fetches on success.
  if (res.ok) revalidateTag(STRAPI_CACHE_TAGS.catalog, { expire: 0 });
  if (res.status === 204) {
    return new NextResponse(null, { status: 200 });
  }
  const data = await res.json().catch(() => null);
  return NextResponse.json(data ?? { ok: true }, { status: res.status });
}