import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { revalidateTag } from "next/cache";
import { requireAdmin, strapiAuthFailure } from "@/lib/admin/require-admin";
import { getStrapiAdminToken } from "@/lib/admin/strapi-admin";
import {
  DESKTOP_NAVIGATION_LABEL_MAX_LENGTH,
  HEADER_WHATSAPP_LABEL_MAX_LENGTH,
  MOBILE_WHATSAPP_LABEL_MAX_LENGTH,
} from "@/lib/public-navigation";
import { STRAPI_CACHE_TAGS } from "@/lib/strapi";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const STRAPI = (process.env.STRAPI_INTERNAL_URL ?? "http://cms:1337").replace(/\/+$/, "");

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

const optionalClearedString = (max: number) => z.union([trimmedString(max), z.null()]).optional();

const optionalFallbackCopy = (max: number) =>
  z
    .union([trimmedString(max), z.null()])
    .transform((value) => (value === "" ? null : value))
    .optional();

const productMessageTemplate = z
  .union([trimmedString(1000), z.null()])
  .transform((value) => (value === "" ? null : value))
  .superRefine((value, ctx) => {
    if (value === null) return;
    const placeholderCount = value.match(/\{productName\}/g)?.length ?? 0;
    if (placeholderCount !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "debe contener exactamente una vez el texto literal {productName}",
      });
    }
  })
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
    message: "no debe contener espacios",
  });

const optionalClearedUrl = z.union([socialLinkString, z.null()]).optional();

const PatchBody = z
  .object({
    siteName: requiredTrimmed(120, "Nombre del sitio").optional(),
    tagline: optionalClearedString(200),
    seoTitle: optionalFallbackCopy(60),
    seoDescription: optionalFallbackCopy(160),
    seoShareImageKicker: optionalFallbackCopy(100),
    seoShareImageTitle: optionalFallbackCopy(120),
    seoShareImageDescription: optionalFallbackCopy(200),
    seoShareImageFooter: optionalFallbackCopy(160),
    seoShareImageAlt: optionalFallbackCopy(200),
    contactEmail: z.union([z.string().email().max(120), z.literal(""), z.null()]).optional(),
    contactPhone: optionalClearedString(40),
    whatsappNumber: optionalClearedString(40),
    whatsappDefaultMessage: requiredTrimmed(1000, "Mensaje predeterminado WhatsApp").optional(),
    address: optionalClearedString(280),
    // Newer singleton fields (schema: `text`, no maxLength) — sensible
    // caps mirror the ones used for comparable scalar text fields.
    dispatchCoverage: optionalClearedString(200),
    addressCity: optionalClearedString(120),
    addressRegion: optionalClearedString(120),
    businessHours: optionalClearedString(280),
    aboutText: optionalClearedString(2000),
    paymentTermsText: optionalClearedString(2000),
    warrantyText: optionalClearedString(2000),
    quoteResponseTimeText: optionalClearedString(280),
    navigationHomeLabel: optionalFallbackCopy(DESKTOP_NAVIGATION_LABEL_MAX_LENGTH),
    navigationCatalogLabel: optionalFallbackCopy(DESKTOP_NAVIGATION_LABEL_MAX_LENGTH),
    navigationAboutLabel: optionalFallbackCopy(DESKTOP_NAVIGATION_LABEL_MAX_LENGTH),
    navigationContactLabel: optionalFallbackCopy(DESKTOP_NAVIGATION_LABEL_MAX_LENGTH),
    headerWhatsappLabel: optionalFallbackCopy(HEADER_WHATSAPP_LABEL_MAX_LENGTH),
    mobileWhatsappLabel: optionalFallbackCopy(MOBILE_WHATSAPP_LABEL_MAX_LENGTH),
    whatsappProductMessageTemplate: productMessageTemplate,
    productCardDetailLabel: optionalFallbackCopy(60),
    productCardWhatsappLabel: optionalFallbackCopy(60),
    productDetailWhatsappLabel: optionalFallbackCopy(80),
    productDetailContactLabel: optionalFallbackCopy(80),
    foundedYear: z.union([z.number().int().min(1800).max(2100), z.null()]).optional(),
    rut: requiredTrimmed(20, "RUT").optional(),
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

function upstreamUnavailable(): NextResponse {
  return NextResponse.json(
    { error: "No se pudo conectar con el servidor de contenido." },
    { status: 502 },
  );
}

function invalidUpstreamBody(status: number): NextResponse {
  return NextResponse.json(
    { error: "El servidor de contenido devolvió una respuesta inválida." },
    { status: status >= 400 ? status : 502 },
  );
}

async function readUpstreamJson(response: Response): Promise<unknown | undefined> {
  return response.json().catch(() => undefined);
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let res: Response;
  try {
    res = await fetch(`${STRAPI}/api/site-setting?populate=*&status=draft`, {
      headers: { Authorization: `Bearer ${getStrapiAdminToken()}` },
      cache: "no-store",
    });
  } catch {
    return upstreamUnavailable();
  }

  if (res.status === 401) return strapiAuthFailure();
  const data = await readUpstreamJson(res);
  if (data === undefined) return invalidUpstreamBody(res.status);
  return NextResponse.json(data, { status: res.status });
}

export async function PUT(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
        : [{ path: [], message: String(err), code: "unknown" }];
    return NextResponse.json({ error: "Datos inválidos", details: { issues } }, { status: 400 });
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
    if (typeof v === "string" && v.trim() === "") continue;
    if (v === null) {
      data[k] = null;
      continue;
    }
    if (k === "socialLinks" && v && typeof v === "object") {
      const cleaned: Record<string, string | null> = {};
      for (const [sk, sv] of Object.entries(v as Record<string, unknown>)) {
        if (sv === null) {
          cleaned[sk] = null;
          continue;
        }
        if (typeof sv === "string") {
          const trimmed = sv.trim();
          if (trimmed === "") continue;
          cleaned[sk] = trimmed;
        }
      }
      data[k] = cleaned;
      continue;
    }
    data[k] = v;
  }

  let res: Response;
  try {
    res = await fetch(`${STRAPI}/api/site-setting?status=published`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${getStrapiAdminToken()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ data }),
      cache: "no-store",
    });
  } catch {
    return upstreamUnavailable();
  }

  if (res.status === 401) return strapiAuthFailure();
  const json = await readUpstreamJson(res);
  if (json === undefined) return invalidUpstreamBody(res.status);
  // ISR milestone: the singleton feeds every public page (brand copy,
  // contacts, dispatch coverage) — purge site-settings-tagged fetches
  // so edits render immediately.
  if (res.ok) revalidateTag(STRAPI_CACHE_TAGS.siteSettings, { expire: 0 });
  return NextResponse.json(json, { status: res.status });
}
