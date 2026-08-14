import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { STRAPI_URL } from "@/lib/strapi";
import { getStrapiAdminToken } from "@/lib/admin/strapi-admin";
import { createRateLimiter } from "./_lib/rateLimit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/leads — public lead capture (lead-capture spec).
 *
 * Replaces the historical `mailto:` form stub with a real, abuse-safe
 * persistence path:
 *
 *   1. Body size capped before parsing (413). Requests without a sane
 *      `content-length` (e.g. chunked transfer) are rejected outright:
 *      reading a chunked stream without a hard byte cap would let a
 *      client allocate unbounded memory before the size check runs.
 *   2. Per-IP rate limits (5/min + daily cap) enforced server-side
 *      BEFORE any body parsing — malformed and oversize bodies cannot
 *      bypass the limiter (429 + Retry-After).
 *   3. Honeypot field `website` — bots that fill it get a silent
 *      200 `{ ok: true }` and NO Lead is created (enforcement
 *      internals are never disclosed).
 *   4. Server-side zod validation with field-level Spanish errors.
 *   5. Idempotency: the client sends a UUID `idempotencyKey`; a
 *      previous Lead with the same key short-circuits to a 201 so
 *      network retries never duplicate Leads.
 *   6. Persistence via POST /api/leads on Strapi with the
 *      admin-scoped token. Success is only reported after Strapi
 *      persisted. Notification is out of scope (no operator
 *      credentials configured), so `status` stays `new`.
 *
 * Response shape: `{ ok: boolean, errors?: Record<string, string> }`
 * — field-level keys (name, email, consent, message, …) plus the
 * reserved `form` key for non-field failures. 201 on success.
 *
 * The Lead content type is private (no Public-role permission), so
 * anonymous clients can neither read nor write it directly.
 */

const MAX_BODY_BYTES = 16 * 1024;
const SOURCE_CONTACT_FORM = "contact-form";

const parsePositiveInt = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const rateLimiter = createRateLimiter({
  perMinute: parsePositiveInt(process.env.LEAD_RATE_LIMIT_PER_MINUTE, 5),
  dailyCap: parsePositiveInt(process.env.LEAD_DAILY_LIMIT, 100),
});

const optionalTrimmed = (max: number) => z.string().trim().max(max).optional();

const LeadSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Ingresa tu nombre.")
    .max(200, "El nombre es demasiado largo."),
  institution: optionalTrimmed(280),
  email: z
    .string()
    .trim()
    .email("Ingresa un correo válido.")
    .max(200, "El correo es demasiado largo."),
  phone: optionalTrimmed(40),
  region: optionalTrimmed(80),
  message: z
    .string()
    .trim()
    .min(1, "Cuéntanos qué necesitas.")
    .max(2000, "El mensaje es demasiado largo."),
  consent: z
    .boolean()
    .refine((value) => value === true, {
      message: "Debes aceptar la política de privacidad para continuar.",
    }),
  consentVersion: z.string().trim().min(1).max(40),
  /** Honeypot — accepted by the schema but rejected earlier in the handler. */
  website: z.string().optional(),
  product: optionalTrimmed(200),
  idempotencyKey: z.string().trim().min(8, "Falta la clave de solicitud.").max(64),
});

type LeadInput = z.infer<typeof LeadSchema>;

/** Deterministic, dependency-free hash — only used to build a stable rate-limit key. */
const hashString = (value: string): string => {
  let hash = 5381;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 33) ^ value.charCodeAt(i);
  }
  return (hash >>> 0).toString(36);
};

/**
 * Derive the client identity for rate limiting.
 *
 * Production sits behind Coolify's Traefik, which APPENDS the real
 * client IP to `x-forwarded-for`. The FIRST entry is written by the
 * client itself (spoofable), so the LAST entry is the trusted one.
 * Fallbacks: `x-real-ip`, then a stable per-request key derived from
 * the user agent + the current minute window (the standard `Request`
 * type does not expose the connection remote address in the Node
 * runtime). The rate limiter prunes expired windows, so the fallback
 * key cannot grow the limiter's memory unboundedly.
 */
const getClientIp = (req: NextRequest): string => {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const parts = forwarded
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
    const trusted = parts[parts.length - 1];
    if (trusted) return trusted;
  }
  const realIp = req.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  const userAgent = req.headers.get("user-agent") ?? "";
  const minuteWindow = Math.floor(Date.now() / 60_000);
  return `ua:${hashString(`${userAgent}|${minuteWindow}`)}`;
};

const strapiBase = () => STRAPI_URL.replace(/\/+$/, "");

const formError = (message: string) =>
  NextResponse.json({ ok: false, errors: { form: message } }, { status: 503 });

async function findExistingLead(idempotencyKey: string, token: string): Promise<boolean> {
  try {
    const res = await fetch(
      `${strapiBase()}/api/leads?filters[idempotencyKey][$eq]=${encodeURIComponent(idempotencyKey)}&pagination[limit]=1`,
      {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      },
    );
    if (!res.ok) return false;
    const json = (await res.json().catch(() => null)) as { data?: unknown[] } | null;
    return Array.isArray(json?.data) && json.data.length > 0;
  } catch {
    // Idempotency check is best-effort; the create attempt decides.
    return false;
  }
}

export async function POST(req: NextRequest) {
  // (b) Rate limit BEFORE any body parsing so malformed JSON and
  // oversize attempts cannot bypass the limiter by returning early —
  // every request consumes budget, whatever its body looks like.
  const ip = getClientIp(req);
  const rate = rateLimiter(ip);
  if (!rate.allowed) {
    return NextResponse.json(
      { ok: false, errors: { form: "Has enviado demasiadas solicitudes. Intenta nuevamente en unos minutos." } },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } },
    );
  }

  // (a) Reject before reading the body: an oversized body would be
  // buffered by `req.text()`; a missing `content-length` means a
  // chunked stream that we would otherwise read unboundedly. Rejecting
  // both up front keeps memory use capped at MAX_BODY_BYTES. (Capped
  // streaming reads would be more lenient, but rejecting is simpler
  // and safe — every legit client of this endpoint (the contact form,
  // curl, browsers) sends a `content-length`.)
  const contentLengthHeader = req.headers.get("content-length");
  if (contentLengthHeader === null) {
    return NextResponse.json(
      { ok: false, errors: { form: "La solicitud es demasiado grande." } },
      { status: 413 },
    );
  }
  const contentLength = Number(contentLengthHeader);
  if (!Number.isFinite(contentLength) || contentLength > MAX_BODY_BYTES) {
    return NextResponse.json(
      { ok: false, errors: { form: "La solicitud es demasiado grande." } },
      { status: 413 },
    );
  }

  let raw: string;
  try {
    raw = await req.text();
  } catch {
    return NextResponse.json(
      { ok: false, errors: { form: "No se pudo leer la solicitud." } },
      { status: 400 },
    );
  }
  if (raw.length > MAX_BODY_BYTES) {
    return NextResponse.json(
      { ok: false, errors: { form: "La solicitud es demasiado grande." } },
      { status: 413 },
    );
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json(
      { ok: false, errors: { form: "Solicitud mal formada." } },
      { status: 400 },
    );
  }

  // Honeypot: pretend success without persisting (no disclosure).
  const honeypot = (body as Record<string, unknown> | null)?.website;
  if (typeof honeypot === "string" && honeypot.trim() !== "") {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  let input: LeadInput;
  try {
    input = LeadSchema.parse(body);
  } catch (err) {
    const errors: Record<string, string> = {};
    if (err instanceof z.ZodError) {
      for (const issue of err.issues) {
        const field = String(issue.path[0] ?? "form");
        if (!(field in errors)) errors[field] = issue.message;
      }
    } else {
      errors.form = "Solicitud mal formada.";
    }
    return NextResponse.json({ ok: false, errors }, { status: 400 });
  }

  const token = getStrapiAdminToken();
  if (!token) {
    // Operator configuration error — log it, never crash the request.
    console.error(
      "[leads] Persistence skipped: STRAPI_ADMIN_TOKEN / STRAPI_API_TOKEN is not set.",
    );
    return formError(
      "No pudimos guardar tu solicitud en este momento. Inténtalo nuevamente en unos minutos.",
    );
  }

  // Network retry dedup: one effective Lead per logical submission.
  if (await findExistingLead(input.idempotencyKey, token)) {
    return NextResponse.json({ ok: true }, { status: 201 });
  }

  const payload = {
    data: {
      name: input.name,
      institution: input.institution ?? null,
      email: input.email,
      phone: input.phone ?? null,
      region: input.region ?? null,
      message: input.message,
      consent: input.consent,
      consentVersion: input.consentVersion,
      source: SOURCE_CONTACT_FORM,
      product: input.product ?? null,
      status: "new",
      idempotencyKey: input.idempotencyKey,
    },
  };

  let res: Response;
  try {
    res = await fetch(`${strapiBase()}/api/leads`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
  } catch (err) {
    console.error("[leads] Strapi network error:", (err as Error).message);
    return formError(
      "No pudimos guardar tu solicitud en este momento. Inténtalo nuevamente en unos minutos.",
    );
  }

  if (!res.ok) {
    console.error(`[leads] Strapi create failed: ${res.status} ${await res.text().catch(() => "")}`);
    return formError(
      "No pudimos guardar tu solicitud en este momento. Inténtalo nuevamente en unos minutos.",
    );
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
