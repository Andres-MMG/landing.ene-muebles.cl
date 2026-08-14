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

const Body = z.object({
  ids: z.array(z.number().int().positive()).min(1).max(8),
});

/**
 * PUT /api/admin/products/[id]/images/order
 *
 * Reorder a product's image gallery. Strapi v5 stores order on the
 * relation row, not on the media row, so we PUT
 * `data: { images: { set: [id1, id2, ...] } }` on the product entry.
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch (err) {
    return NextResponse.json(
      { error: 'Datos inválidos', details: String(err) },
      { status: 400 }
    );
  }

  const res = await fetch(`${STRAPI}/api/products/${id}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${getStrapiAdminToken()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ data: { images: { set: body.ids } } }),
    cache: 'no-store',
  });
  const data = await res.json().catch(() => null);
  // ISR milestone: the gallery order is visible on the product page —
  // purge catalog-tagged fetches on success.
  if (res.ok) revalidateTag(STRAPI_CACHE_TAGS.catalog, { expire: 0 });
  return NextResponse.json(data, { status: res.status });
}