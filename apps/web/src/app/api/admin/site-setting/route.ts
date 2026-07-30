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
 *
 * Validation contract:
 *   - Required-by-domain fields (`siteName`, `rut`, `whatsappDefaultMessage`)
 *     reject empty AND whitespace-only values; the parsed value is the
 *     trimmed string so the rest of the handler never sees raw whitespace.
 *   - Optional fields accept either a trimmed string OR explicit `null`,
 *     where `null` means "clear this field in Strapi" (Strapi v5
 *     singleType honors `null` for clearing a scalar component value).
 *   - `socialLinks.*` follow the same `null` = clear semantics so the
 *     admin can wipe a previously saved handle without sending `""`.
 *     The form owns the URL-vs-handle normalization (see
 *     `normalizeSocialHandle` in the admin form), so the route is
 *     permissive: any trimmed non-empty string up to 280 chars is
 *     forwarded. Internal whitespace is still rejected with a clear
 *     Zod issue naming the field — neither a URL nor a platform
 *     handle can legitimately contain a space, and accepting it
 *     would only ever be a typo.
 *   - Zod failures surface as `{ error, details: { issues } }` so the
 *     admin UI can render field-level errors.
 */

const trimmedString = (max: number) =>
  z
    .string()
    .max(max)
    .transform((s) => s.trim());

const requiredTrimmed = (max: number, label: string) =>
  trimmedString(max).refine((s) => s.length > 0, {
    message: `${label} no debe estar vacío`,
  });

const optionalClearedString = (max: number) =>
  z
    .union([trimmedString(max), z.null()])
    .optional();

/**
 * Permissive social-link value: a trimmed string ≤280 chars OR `null`.
 * `null` means "clear this social handle in Strapi". Empty string after
 * trim is accepted so the form (which explicitly sends `''` for
 * "drop this key") flows through unchanged; the per-key drop happens
 * in the handler, not the schema.
 *
 * Internal whitespace is rejected with `socialLinks.<key>: no debe
 * contener espacios` so a clearly-malformed attempt (e.g. `ht tp://x`,
 * `ene muebles`) surfaces a Zod issue naming the field instead of
 * silently forwarding garbage to Strapi.
 */
const socialLinkString = z
  .string()
  .max(280)
  .transform((s) => s.trim())
  .refine((s) => !/\s/.test(s), {
    message: 'no debe contener espacios',
  });

const optionalClearedUrl = z
  .union([socialLinkString, z.null()])
  .optional();

const PatchBody = z
  .object({
    siteName: requiredTrimmed(120, 'Nombre del sitio').optional(),
    tagline: optionalClearedString(200),
    contactEmail: z.union([z.string().email().max(120), z.literal(''), z.null()]).optional(),
    contactPhone: optionalClearedString(40),
    whatsappNumber: optionalClearedString(40),
    whatsappDefaultMessage: requiredTrimmed(1000, 'Mensaje predeterminado WhatsApp').optional(),
    address: optionalClearedString(280),
    businessHours: optionalClearedString(280),
    aboutText: optionalClearedString(2000),
    rut: requiredTrimmed(20, 'RUT').optional(),
    socialLinks: z
      .object({
        facebook: optionalClearedUrl,
        instagram: optionalClearedUrl,
        tiktok: optionalClearedUrl,
        linkedin: optionalClearedUrl,
      })
      .strict()
      .partial()
      .optional(),
  })
  .strict();

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

export async function PUT(req: NextRequest) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: z.infer<typeof PatchBody>;
  try {
    body = PatchBody.parse(await req.json());
  } catch (err) {
    // Surface Zod issues in a structured shape so the admin UI can map
    // them back to field-level errors. Non-Zod failures fall back to a
    // single `unknown` issue so callers always see the same shape.
    const issues =
      err instanceof z.ZodError
        ? err.issues.map((i) => ({
            path: i.path,
            message: i.message,
            code: i.code,
          }))
        : [{ path: [], message: String(err), code: 'unknown' }];
    return NextResponse.json(
      { error: 'Datos inválidos', details: { issues } },
      { status: 400 }
    );
  }

  // Build the Strapi `data` payload:
  //   - drop top-level fields that are absent or empty-after-trim
  //     (the form may send a partial diff; Strapi singleType PUT is a
  //     full document, but omitted keys keep their previous value).
  //   - `null` values are forwarded so the admin can clear a previously
  //     saved field without sending `""` (Strapi v5 treats "" as "" not
  //     null, so a sentinel null is the only way to clear cleanly).
  //   - for `socialLinks`, propagate per-key `null` and drop empties so
  //     the admin can wipe a saved handle and keep the rest intact.
  //   - all forwarded strings are already trimmed by the Zod transforms.
  const data: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body)) {
    if (v === undefined) continue;
    if (typeof v === 'string' && v.trim() === '') continue;
    if (v === null) {
      data[k] = null;
      continue;
    }
    if (k === 'socialLinks' && v && typeof v === 'object') {
      const cleaned: Record<string, string | null> = {};
      for (const [sk, sv] of Object.entries(v as Record<string, unknown>)) {
        if (sv === null) {
          cleaned[sk] = null;
          continue;
        }
        if (typeof sv === 'string') {
          const trimmed = sv.trim();
          if (trimmed === '') continue;
          cleaned[sk] = trimmed;
        }
      }
      data[k] = cleaned;
      continue;
    }
    data[k] = v;
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