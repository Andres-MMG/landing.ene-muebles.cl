import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { revalidateTag } from 'next/cache';
import { getServerSession } from '@/lib/admin/session';
import { getStrapiAdminToken } from '@/lib/admin/strapi-admin';
import { STRAPI_CACHE_TAGS } from '@/lib/strapi';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/admin/hero-section
 *   Read the `hero-section` singleton (populate=*).
 *
 * PUT /api/admin/hero-section
 *   Update copy + CTA targets. The `image` media field is intentionally
 *   left out of this batch — image editing lives behind a dedicated
 *   upload flow (same separation-of-concerns used for product images
 *   and for `SiteSettingForm`).
 *
 *   Required-by-domain fields (eyebrow, title, primaryCtaLabel,
 *   primaryCtaHref) reject empty + whitespace. The secondary CTA is
 *   optional: clearing both label and href removes it from the hero.
 */

const trimmedString = (max: number) =>
  z.string().max(max).transform((s) => s.trim());

const requiredTrimmed = (max: number, label: string) =>
  trimmedString(max).refine((s) => s.length > 0, { message: `${label} no debe estar vacío` });

const optionalClearedString = (max: number) =>
  z.union([trimmedString(max), z.null()]).optional();

const PatchBody = z
  .object({
    eyebrow: requiredTrimmed(120, 'Etiqueta superior').optional(),
    title: requiredTrimmed(200, 'Título').optional(),
    subtitle: optionalClearedString(800),
    primaryCtaLabel: requiredTrimmed(60, 'Etiqueta del CTA principal').optional(),
    primaryCtaHref: requiredTrimmed(200, 'URL del CTA principal').optional(),
    secondaryCtaLabel: optionalClearedString(60),
    secondaryCtaHref: optionalClearedString(200),
  })
  .strict();

export async function GET() {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const res = await fetch(
    `${(process.env.STRAPI_INTERNAL_URL ?? 'http://cms:1337').replace(/\/+$/, '')}/api/hero-section?populate=*`,
    {
      headers: { Authorization: `Bearer ${getStrapiAdminToken()}` },
      cache: 'no-store',
    }
  );
  const data = await res.json().catch(() => null);
  return NextResponse.json(data ?? { data: null }, { status: res.status });
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: z.infer<typeof PatchBody>;
  try {
    body = PatchBody.parse(await req.json());
  } catch (err) {
    const issues =
      err instanceof z.ZodError
        ? err.issues.map((i) => ({ path: i.path, message: i.message, code: i.code }))
        : [{ path: [], message: String(err), code: 'unknown' }];
    return NextResponse.json(
      { error: 'Datos inválidos', details: { issues } },
      { status: 400 }
    );
  }

  // Secondary CTA: when BOTH label and href are missing/null the
  // form signals "no secondary CTA" by sending neither; in that case
  // we forward `null` for both keys so Strapi clears the saved pair.
  // When only one of the pair is cleared (label present, href null
  // — or vice-versa) we forward the present one trimmed and the
  // missing one as `null` so the editor can wipe one half.
  const data: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body)) {
    if (v === undefined) continue;
    if (typeof v === 'string' && v.trim() === '') continue;
    if (v === null) {
      data[k] = null;
      continue;
    }
    data[k] = v;
  }

  const res = await fetch(
    `${(process.env.STRAPI_INTERNAL_URL ?? 'http://cms:1337').replace(/\/+$/, '')}/api/hero-section`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${getStrapiAdminToken()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ data }),
      cache: 'no-store',
    }
  );
  const json = await res.json().catch(() => null);
  // ISR milestone: hero copy renders on home/contacto/nosotros —
  // purge sections-tagged fetches so edits render immediately.
  if (res.ok) revalidateTag(STRAPI_CACHE_TAGS.sections, { expire: 0 });
  return NextResponse.json(json, { status: res.status });
}
