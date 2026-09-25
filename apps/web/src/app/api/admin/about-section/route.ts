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

const optionalClearedString = (max: number) => z.union([trimmedString(max), z.null()]).optional();
const optionalClearedMetadata = (max: number) =>
  optionalClearedString(max).transform((value) => (value === "" ? null : value));

const ValueItem = z
  .object({
    title: trimmedString(80),
    body: trimmedString(400),
  })
  .strict();

const PutBody = z
  .object({
    seoTitle: optionalClearedMetadata(60),
    seoDescription: optionalClearedMetadata(160),
    eyebrow: requiredTrimmed(80, "Etiqueta superior"),
    title: requiredTrimmed(200, "Título"),
    intro: optionalClearedString(600),
    body: optionalClearedString(4000),
    pageEyebrow: optionalClearedString(80),
    pageTitle: optionalClearedString(200),
    yearsInBusinessLabel: optionalClearedString(80),
    productCountLabel: optionalClearedString(80),
    productLineCountLabel: optionalClearedString(80),
    coverageLabel: optionalClearedString(80),
    warrantyLabel: optionalClearedString(80),
    projectCtaTitle: optionalClearedString(200),
    projectCtaBody: optionalClearedString(600),
    projectCtaLabel: optionalClearedString(80),
    missionLabel: optionalClearedString(40),
    missionHeading: optionalClearedString(200),
    missionBody: optionalClearedString(1000),
    visionLabel: optionalClearedString(40),
    visionHeading: optionalClearedString(200),
    visionBody: optionalClearedString(1000),
    valuesLabel: optionalClearedString(40),
    valuesHeading: optionalClearedString(200),
    values: z.array(ValueItem).max(4, "Sólo se permiten 4 valores").optional(),
  })
  .strict();

function strapiUrl(path: string): string {
  const base = (process.env.STRAPI_INTERNAL_URL ?? "http://cms:1337").replace(/\/+$/, "");
  return base + path;
}

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function upstreamUnavailable(): NextResponse {
  return NextResponse.json(
    { error: "No se pudo conectar con el servidor de contenido." },
    { status: 502 },
  );
}
function invalidUpstreamResponse(status: number) {
  return NextResponse.json(
    { error: "El servidor de contenido devolvió una respuesta inválida." },
    { status: status >= 400 ? status : 502 },
  );
}

async function readUpstreamJson(response: Response): Promise<unknown | null> {
  return response.json().catch(() => null);
}

export async function GET() {
  if (!(await requireAdmin())) return unauthorized();

  let response: Response;
  try {
    response = await fetch(strapiUrl("/api/about-section?populate=*&status=draft"), {
      headers: { Authorization: "Bearer " + getStrapiAdminToken() },
      cache: "no-store",
    });
  } catch {
    return upstreamUnavailable();
  }

  if (response.status === 401) return strapiAuthFailure();

  const json = await readUpstreamJson(response);
  if (json === null) return invalidUpstreamResponse(response.status);
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

  const data: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body)) {
    if (value === undefined) continue;
    if (typeof value === "string" && value.length === 0) continue;
    data[key] = value;
  }

  let response: Response;
  try {
    response = await fetch(strapiUrl("/api/about-section?status=published"), {
      method: "PUT",
      headers: {
        Authorization: "Bearer " + getStrapiAdminToken(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ data }),
      cache: "no-store",
    });
  } catch {
    return upstreamUnavailable();
  }

  if (response.status === 401) return strapiAuthFailure();

  const json = await readUpstreamJson(response);
  if (json === null) return invalidUpstreamResponse(response.status);

  if (response.ok) {
    revalidateTag(STRAPI_CACHE_TAGS.sections, { expire: 0 });
  }

  return NextResponse.json(json, { status: response.status });
}
