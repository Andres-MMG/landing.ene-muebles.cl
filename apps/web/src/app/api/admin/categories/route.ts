import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { getServerSession } from '@/lib/admin/session';
import { getStrapiAdminToken } from '@/lib/admin/strapi-admin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const STRAPI = (process.env.STRAPI_INTERNAL_URL ?? 'http://cms:1337').replace(
  /\/+$/,
  ''
);

/**
 * GET /api/admin/categories
 *   List every category (drafts included) with `populate=products.count`
 *   so the dashboard / list page can show the product count without
 *   a second round-trip.
 *
 * POST /api/admin/categories
 *   Create a category. Caller passes `name`, optional `slug`
 *   (auto-generated from name when omitted), `description`, `order`,
 *   `active`. The `image` relation is set on the edit endpoint, not
 *   here — single-file uploads have their own route.
 */

export async function GET() {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const qs = new URLSearchParams();
  qs.set('pagination[pageSize]', '100');
  qs.set('sort', 'order:asc');
  qs.set('populate[image]', 'true');
  qs.set('populate[products][count]', 'true');
  qs.set('populate[products][fields][0]', 'id');
  qs.set('publicationState', 'preview');
  qs.set('locale', 'es');

  const res = await fetch(`${STRAPI}/api/categories?${qs.toString()}`, {
    headers: { Authorization: `Bearer ${getStrapiAdminToken()}` },
    cache: 'no-store',
  });
  const data = await res.json().catch(() => null);
  return NextResponse.json(data ?? { data: [] }, { status: res.status });
}

const CreateBody = z.object({
  name: z.string().min(1).max(80),
  slug: z
    .string()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9-]+$/, 'slug inválido')
    .optional(),
  description: z.string().max(500).optional(),
  order: z.number().int().nonnegative().default(0),
  active: z.boolean().default(true),
});

function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: z.infer<typeof CreateBody>;
  try {
    body = CreateBody.parse(await req.json());
  } catch (err) {
    return NextResponse.json(
      { error: 'Datos inválidos', details: String(err) },
      { status: 400 }
    );
  }

  const slug = body.slug ?? slugify(body.name);

  const res = await fetch(`${STRAPI}/api/categories`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getStrapiAdminToken()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      data: {
        name: body.name,
        slug,
        description: body.description,
        order: body.order,
        active: body.active,
      },
    }),
    cache: 'no-store',
  });
  const data = await res.json().catch(() => null);
  return NextResponse.json(data, { status: res.status });
}