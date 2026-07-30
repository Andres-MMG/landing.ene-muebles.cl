import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { getServerSession } from '@/lib/admin/session';
import { getStrapiAdminToken } from '@/lib/admin/strapi-admin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/admin/contact-cta-section
 *   Read the `contact-cta-section` singleton.
 *
 * PUT /api/admin/contact-cta-section
 *   Update heading / body / button label / button href. title and
 *   buttonLabel are required; body and buttonHref are optional.
 *   `buttonHref = null` means "let the route build the WhatsApp href
 *   from site-setting.whatsappNumber" — clearing it is the
 *   recommended way to fall back to the legacy behavior.
 */

const trimmedString = (max: number) =>
  z.string().max(max).transform((s) => s.trim());

const requiredTrimmed = (max: number, label: string) =>
  trimmedString(max).refine((s) => s.length > 0, { message: `${label} no debe estar vacío` });

const optionalClearedString = (max: number) =>
  z.union([trimmedString(max), z.null()]).optional();

const PatchBody = z
  .object({
    title: requiredTrimmed(200, 'Título').optional(),
    body: optionalClearedString(1000),
    buttonLabel: requiredTrimmed(60, 'Etiqueta del botón').optional(),
    buttonHref: optionalClearedString(300),
  })
  .strict();

export async function GET() {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const res = await fetch(
    `${(process.env.STRAPI_INTERNAL_URL ?? 'http://cms:1337').replace(/\/+$/, '')}/api/contact-cta-section`,
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
    `${(process.env.STRAPI_INTERNAL_URL ?? 'http://cms:1337').replace(/\/+$/, '')}/api/contact-cta-section`,
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
  return NextResponse.json(json, { status: res.status });
}
