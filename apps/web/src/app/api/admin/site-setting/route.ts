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
 * GET /api/admin/site-setting
 *   Read the current `site-setting` singleton.
 *
 * PUT /api/admin/site-setting
 *   Update one or more fields on the singleton. Strapi v5 singleType
 *   has no document ID — the endpoint is just `/api/site-setting`.
 */

export async function GET() {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const res = await fetch(`${STRAPI}/api/site-setting?populate=*`, {
    headers: { Authorization: `Bearer ${getStrapiAdminToken()}` },
    cache: 'no-store',
  });
  const data = await res.json().catch(() => null);
  return NextResponse.json(data ?? { data: null }, { status: res.status });
}

const PatchBody = z
  .object({
    brandName: z.string().max(120).optional(),
    tagline: z.string().max(280).optional(),
    contactEmail: z.string().email().max(120).optional().or(z.literal('')),
    contactPhone: z.string().max(40).optional(),
    address: z.string().max(280).optional(),
    socialInstagram: z.string().url().max(280).optional().or(z.literal('')),
    socialFacebook: z.string().url().max(280).optional().or(z.literal('')),
    socialLinkedIn: z.string().url().max(280).optional().or(z.literal('')),
    heroTitle: z.string().max(160).optional(),
    heroSubtitle: z.string().max(400).optional(),
    footerCopy: z.string().max(400).optional(),
  })
  .strict();

export async function PUT(req: NextRequest) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: z.infer<typeof PatchBody>;
  try {
    body = PatchBody.parse(await req.json());
  } catch (err) {
    return NextResponse.json(
      { error: 'Datos inválidos', details: String(err) },
      { status: 400 }
    );
  }

  // Strip empty-string optionals so Strapi doesn't store them as "".
  const data: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body)) {
    if (v !== '') data[k] = v;
  }

  const res = await fetch(`${STRAPI}/api/site-setting`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${getStrapiAdminToken()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ data }),
    cache: 'no-store',
  });
  const json = await res.json().catch(() => null);
  return NextResponse.json(json, { status: res.status });
}