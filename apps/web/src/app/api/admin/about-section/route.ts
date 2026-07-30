import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { getServerSession } from '@/lib/admin/session';
import { getStrapiAdminToken } from '@/lib/admin/strapi-admin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/admin/about-section
 *   Read the `about-section` singleton (populate=*).
 *
 * PUT /api/admin/about-section
 *   Update the singleton. Strapi v5 singleType has no document id —
 *   the endpoint is `/api/about-section`. The required-by-domain
 *   fields (eyebrow, title) reject empty and whitespace-only input.
 *   Optional fields accept a trimmed string OR `null` (clear).
 *   `values` (the four-commitment cards) is forwarded as a JSON array
 *   of `{ title, body }` so the editor can add or remove items.
 */

const trimmedString = (max: number) =>
  z.string().max(max).transform((s) => s.trim());

const requiredTrimmed = (max: number, label: string) =>
  trimmedString(max).refine((s) => s.length > 0, { message: `${label} no debe estar vacío` });

const optionalClearedString = (max: number) =>
  z.union([trimmedString(max), z.null()]).optional();

const ValueItem = z
  .object({
    title: trimmedString(80),
    body: trimmedString(400),
  })
  .strict();

const PatchBody = z
  .object({
    // B2 batch 2 fix: eyebrow and title are REQUIRED by the Strapi
    // schema (minLength: 1, required: true). Reject the PATCH with
    // 400 when either is missing entirely, mirroring the upstream
    // contract — the form always sends them.
    eyebrow: requiredTrimmed(80, 'Etiqueta superior'),
    title: requiredTrimmed(200, 'Título'),
    intro: optionalClearedString(600),
    body: optionalClearedString(4000),
    // B2 batch 2 fix: label (kicker) and heading (h2) are separate
    // schema fields. Keep both in the patch contract.
    missionLabel: optionalClearedString(40),
    missionHeading: optionalClearedString(200),
    missionBody: optionalClearedString(1000),
    visionLabel: optionalClearedString(40),
    visionHeading: optionalClearedString(200),
    visionBody: optionalClearedString(1000),
    valuesLabel: optionalClearedString(40),
    valuesHeading: optionalClearedString(200),
    values: z.array(ValueItem).optional(),
  })
  .strict();

export async function GET() {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const res = await fetch(
    `${(process.env.STRAPI_INTERNAL_URL ?? 'http://cms:1337').replace(/\/+$/, '')}/api/about-section?populate=*`,
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

  // Same diff/clear semantics as the site-setting route: drop fields
  // the form omitted, forward `null` to clear, trim strings.
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
    `${(process.env.STRAPI_INTERNAL_URL ?? 'http://cms:1337').replace(/\/+$/, '')}/api/about-section`,
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
