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
    message: `${label} no debe estar vacío`,
  });

const optionalClearedString = (max: number) => z.union([trimmedString(max), z.null()]).optional();

const PatchBody = z
  .object({
    eyebrow: optionalClearedString(80),
    title: requiredTrimmed(200, "Título").optional(),
    body: optionalClearedString(1000),
    buttonLabel: requiredTrimmed(60, "Etiqueta del botón").optional(),
    buttonHref: optionalClearedString(300),
    emailLabel: optionalClearedString(60),
  })
  .strict();

function strapiUrl(): string {
  const base = (process.env.STRAPI_INTERNAL_URL ?? "http://cms:1337").replace(/\/+$/, "");
  return `${base}/api/contact-cta-section`;
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
    response = await fetch(strapiUrl(), {
      headers: { Authorization: `Bearer ${getStrapiAdminToken()}` },
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

  let body: z.infer<typeof PatchBody>;
  try {
    body = PatchBody.parse(await request.json());
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
    if (typeof value === "string" && value === "") continue;
    data[key] = value;
  }

  let response: Response;
  try {
    response = await fetch(strapiUrl(), {
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

  if (response.status === 401) return strapiAuthFailure();
  const json = await readUpstreamJson(response);
  if (json === undefined) return invalidUpstreamBody(response.status);

  if (response.ok) {
    revalidateTag(STRAPI_CACHE_TAGS.sections, { expire: 0 });
  }

  return NextResponse.json(json, { status: response.status });
}
