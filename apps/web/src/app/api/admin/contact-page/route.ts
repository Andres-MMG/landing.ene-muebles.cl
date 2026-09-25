import { revalidateTag } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin, strapiAuthFailure } from "@/lib/admin/require-admin";
import { getStrapiAdminToken } from "@/lib/admin/strapi-admin";
import { STRAPI_CACHE_TAGS } from "@/lib/strapi";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const requiredTrimmed = (max: number, label: string) =>
  z
    .string()
    .max(max)
    .transform((value) => value.trim())
    .refine((value) => value.length > 0, { message: label + " no debe estar vacío" });

const optionalClearedString = (max: number) =>
  z
    .union([
      z
        .string()
        .max(max)
        .transform((value) => value.trim()),
      z.null(),
    ])
    .transform((value) => (value === "" ? null : value));

const PutBody = z
  .object({
    seoTitle: optionalClearedString(60).optional(),
    seoDescription: optionalClearedString(160).optional(),
    heroEyebrow: requiredTrimmed(80, "Etiqueta principal"),
    heroTitle: requiredTrimmed(180, "Título principal"),
    heroBody: requiredTrimmed(600, "Descripción principal"),
    whatsappCtaLabel: requiredTrimmed(80, "Botón de WhatsApp"),
    emailCtaLabel: requiredTrimmed(60, "Etiqueta del correo"),
    alternateContactEyebrow: requiredTrimmed(80, "Etiqueta de contacto alternativo"),
    phoneContactLabel: requiredTrimmed(60, "Etiqueta del teléfono"),
    whatsappContactLabel: requiredTrimmed(60, "Etiqueta de WhatsApp"),
    businessHoursLabel: requiredTrimmed(60, "Etiqueta del horario"),
    addressLabel: requiredTrimmed(60, "Etiqueta de la dirección"),
    formEyebrow: requiredTrimmed(80, "Etiqueta del formulario"),
    formTitle: requiredTrimmed(180, "Título del formulario"),
    formBody: requiredTrimmed(600, "Texto del formulario"),
    nameFieldLabel: requiredTrimmed(80, "Campo nombre"),
    institutionFieldLabel: requiredTrimmed(120, "Campo institución"),
    emailFieldLabel: requiredTrimmed(80, "Campo correo"),
    phoneFieldLabel: requiredTrimmed(80, "Campo teléfono"),
    productFieldLabel: requiredTrimmed(180, "Campo producto"),
    generalInquiryLabel: requiredTrimmed(120, "Opción general"),
    regionFieldLabel: requiredTrimmed(80, "Campo región"),
    regionPlaceholder: requiredTrimmed(120, "Opción inicial de región"),
    messageFieldLabel: requiredTrimmed(180, "Campo mensaje"),
    consentBeforeLink: requiredTrimmed(120, "Consentimiento previo"),
    consentPrivacyLinkLabel: requiredTrimmed(120, "Enlace de privacidad"),
    consentAfterLink: requiredTrimmed(300, "Consentimiento posterior"),
    responseTimeText: requiredTrimmed(160, "Plazo de respuesta"),
    submitLabel: requiredTrimmed(80, "Botón de envío"),
  })
  .strict();

function strapiUrl(status?: "draft" | "published"): string {
  const base = (process.env.STRAPI_INTERNAL_URL ?? "http://cms:1337").replace(/\/+$/, "");
  return base + "/api/contact-page" + (status ? "?status=" + status : "");
}

function unauthorized(): NextResponse {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

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
  if (!(await requireAdmin())) return unauthorized();

  let response: Response;
  try {
    response = await fetch(strapiUrl("draft"), {
      headers: { Authorization: "Bearer " + getStrapiAdminToken() },
      cache: "no-store",
    });
  } catch {
    return upstreamUnavailable();
  }

  if (response.status === 401) return strapiAuthFailure();
  const json = await readUpstreamJson(response);
  if (json === undefined) return invalidUpstreamBody(response.status);
  return NextResponse.json(json, { status: response.status });
}

export async function PUT(request: NextRequest) {
  if (!(await requireAdmin())) return unauthorized();

  let body: z.infer<typeof PutBody>;
  try {
    body = PutBody.parse(await request.json());
  } catch (error) {
    const issues =
      error instanceof z.ZodError
        ? error.issues.map((issue) => ({
            path: issue.path,
            message: issue.message,
            code: issue.code,
          }))
        : [{ path: [], message: String(error), code: "unknown" }];
    return NextResponse.json({ error: "Datos inválidos", details: { issues } }, { status: 400 });
  }

  let response: Response;
  try {
    response = await fetch(strapiUrl("published"), {
      method: "PUT",
      headers: {
        Authorization: "Bearer " + getStrapiAdminToken(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ data: body }),
      cache: "no-store",
    });
  } catch {
    return upstreamUnavailable();
  }

  if (response.status === 401) return strapiAuthFailure();
  const json = await readUpstreamJson(response);
  if (json === undefined) return invalidUpstreamBody(response.status);

  if (response.ok) {
    revalidateTag(STRAPI_CACHE_TAGS.contactPage, { expire: 0 });
  }

  return NextResponse.json(json, { status: response.status });
}
