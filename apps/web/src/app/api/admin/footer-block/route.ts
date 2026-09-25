import { revalidateTag } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin, strapiAuthFailure } from "@/lib/admin/require-admin";
import { getStrapiAdminToken } from "@/lib/admin/strapi-admin";
import { STRAPI_CACHE_TAGS } from "@/lib/strapi";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const trimmedString = (max: number) =>
  z
    .string()
    .max(max)
    .transform((value) => value.trim());

const requiredTrimmed = (max: number, label: string) =>
  trimmedString(max).refine((value) => value.length > 0, {
    message: label + " no debe estar vacío",
  });

const optionalClearedString = (max: number) =>
  z
    .union([trimmedString(max), z.null()])
    .transform((value) => (typeof value === "string" && value.length === 0 ? null : value))
    .optional();

const PutBody = z
  .object({
    copyrightText: requiredTrimmed(200, "Texto de copyright").optional(),
    tagline: optionalClearedString(300),
    legalSnippet: optionalClearedString(300),
    productCountSuffix: optionalClearedString(160),
    catalogHeading: optionalClearedString(60),
    contactHeading: optionalClearedString(60),
    legalHeading: optionalClearedString(60),
    socialHeading: optionalClearedString(60),
    catalogCtaLabel: optionalClearedString(80),
    officeLineLabel: optionalClearedString(80),
    schoolLineLabel: optionalClearedString(80),
    aboutLinkLabel: optionalClearedString(80),
    termsLinkLabel: optionalClearedString(120),
    privacyLinkLabel: optionalClearedString(120),
    rutLabel: optionalClearedString(30),
    catalogStampLabel: optionalClearedString(120),
    writtenBackingLabel: optionalClearedString(120),
  })
  .strict();

function strapiUrl(status: "draft" | "published"): string {
  const base = (process.env.STRAPI_INTERNAL_URL ?? "http://cms:1337").replace(/\/+$/, "");
  return base + "/api/footer-block?status=" + status;
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

function invalidUpstreamBody(): NextResponse {
  return NextResponse.json(
    { error: "El servidor de contenido devolvió una respuesta inválida." },
    { status: 502 },
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
  if (json === undefined) return invalidUpstreamBody();

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
  if (json === undefined) return invalidUpstreamBody();

  if (response.ok) {
    revalidateTag(STRAPI_CACHE_TAGS.sections, { expire: 0 });
  }

  return NextResponse.json(json, { status: response.status });
}
