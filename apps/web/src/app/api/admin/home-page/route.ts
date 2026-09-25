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
    catalogEyebrow: requiredTrimmed(120, "Etiqueta de líneas"),
    catalogTitle: requiredTrimmed(240, "Título de líneas"),
    catalogBody: requiredTrimmed(800, "Descripción de líneas"),
    catalogCtaLabel: requiredTrimmed(80, "Botón de líneas"),
    featuredEyebrow: requiredTrimmed(120, "Etiqueta de destacados"),
    featuredTitle: requiredTrimmed(240, "Título de destacados"),
    featuredBody: requiredTrimmed(800, "Descripción de destacados"),
    featuredCtaLabel: requiredTrimmed(80, "Botón de destacados"),
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
    response = await fetch(strapiUrl("/api/home-page?status=draft"), {
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
    response = await fetch(strapiUrl("/api/home-page?status=published"), {
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
    revalidateTag(STRAPI_CACHE_TAGS.homePage, { expire: 0 });
  }

  return NextResponse.json(json, { status: response.status });
}
