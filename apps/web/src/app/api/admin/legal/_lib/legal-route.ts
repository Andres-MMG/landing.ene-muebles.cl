import { revalidateTag } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin, strapiAuthFailure } from "@/lib/admin/require-admin";
import { getStrapiAdminToken } from "@/lib/admin/strapi-admin";
import {
  hasValidLegalTemplateSyntax,
  isLegalVersion,
  LEGAL_PAGE_CACHE_TAG,
  parseLegalUpstreamRecord,
  type LegalCode,
  type LegalUpstreamRecord,
} from "@/lib/legal-pages";

const requiredCopy = (max: number) =>
  z
    .string()
    .max(max)
    .transform((value, context) => {
      const trimmed = value.trim();
      if (!trimmed) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: "El campo no debe estar vacío." });
        return z.NEVER;
      }
      if (!hasValidLegalTemplateSyntax(trimmed)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "El texto contiene una variable no permitida.",
        });
        return z.NEVER;
      }
      return trimmed;
    });

const optionalMetadata = (max: number) =>
  z
    .union([
      z
        .string()
        .max(max)
        .transform((value) => value.trim()),
      z.null(),
    ])
    .transform((value) => (value === "" ? null : value));

const UpdatedAt = z.string().datetime({ offset: true });
const Paragraph = z.object({ text: requiredCopy(1200) }).strict();
const Section = z
  .object({
    heading: requiredCopy(160),
    paragraphs: z.array(Paragraph).min(1).max(6),
  })
  .strict();

export const LegalPutBody = z
  .object({
    metadataTitle: optionalMetadata(60).optional(),
    metadataDescription: optionalMetadata(160).optional(),
    eyebrow: requiredCopy(80),
    title: requiredCopy(180),
    intro: requiredCopy(800),
    tocLabel: requiredCopy(80),
    updatedLabel: requiredCopy(80),
    effectiveDate: z.string().date(),
    version: z.string().refine(isLegalVersion, "La versión tiene un formato inválido."),
    sections: z.array(Section).min(1).max(20),
    expectedUpdatedAt: UpdatedAt,
  })
  .strict();

type LegalBody = z.infer<typeof LegalPutBody>;

const baseUrl = () => (process.env.STRAPI_INTERNAL_URL ?? "http://cms:1337").replace(/\/+$/, "");

function listUrl(code: LegalCode, status: "draft" | "published"): string {
  const params = new URLSearchParams({
    "filters[code][$eq]": code,
    status,
    "pagination[pageSize]": "2",
    "populate[sections][populate][paragraphs]": "true",
  });
  return `${baseUrl()}/api/legal-pages?${params.toString()}`;
}

function documentUrl(documentId: string): string {
  const params = new URLSearchParams({
    status: "published",
    "populate[sections][populate][paragraphs]": "true",
  });
  return `${baseUrl()}/api/legal-pages/${encodeURIComponent(documentId)}?${params.toString()}`;
}

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function unavailable() {
  return NextResponse.json(
    { error: "No se pudo conectar con el servidor de contenido." },
    { status: 502 },
  );
}

function invalidUpstream(status = 502) {
  return NextResponse.json(
    { error: "El servidor de contenido devolvió una respuesta inválida." },
    { status },
  );
}

async function upstreamFetch(url: string, init?: RequestInit): Promise<Response | NextResponse> {
  try {
    const response = await fetch(url, {
      ...init,
      headers: {
        Authorization: `Bearer ${getStrapiAdminToken()}`,
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...init?.headers,
      },
      cache: "no-store",
    });
    if (response.status === 401) return strapiAuthFailure();
    return response;
  } catch {
    return unavailable();
  }
}

async function readJson(response: Response): Promise<unknown | undefined> {
  return response.json().catch(() => undefined);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function readExactlyOne(
  code: LegalCode,
  status: "draft" | "published",
): Promise<LegalUpstreamRecord | NextResponse | null> {
  const response = await upstreamFetch(listUrl(code, status));
  if (response instanceof NextResponse) return response;
  const json = await readJson(response);
  if (!response.ok) return invalidUpstream(response.status);
  if (!isRecord(json) || !Array.isArray(json.data)) return invalidUpstream();
  if (json.data.length === 0) return null;
  if (json.data.length !== 1) return invalidUpstream();

  try {
    return parseLegalUpstreamRecord(json.data[0], code);
  } catch {
    return invalidUpstream();
  }
}

function materialPrivacyValue(value: LegalBody | LegalUpstreamRecord): string {
  return JSON.stringify({
    eyebrow: value.eyebrow,
    title: value.title,
    intro: value.intro,
    tocLabel: value.tocLabel,
    updatedLabel: value.updatedLabel,
    effectiveDate: value.effectiveDate,
    sections: value.sections.map((section) => ({
      heading: section.heading,
      paragraphs: section.paragraphs.map((paragraph) => ({ text: paragraph.text })),
    })),
  });
}

export function createLegalRoute(code: LegalCode) {
  return {
    async GET() {
      if (!(await requireAdmin())) return unauthorized();
      const record = await readExactlyOne(code, "draft");
      if (record instanceof NextResponse) return record;
      if (!record) {
        return NextResponse.json({ error: "No se encontró la página legal." }, { status: 404 });
      }
      return NextResponse.json({ data: record });
    },

    async PUT(request: NextRequest) {
      if (!(await requireAdmin())) return unauthorized();
      let body: LegalBody;
      try {
        body = LegalPutBody.parse(await request.json());
      } catch (error) {
        const issues = error instanceof z.ZodError ? error.issues : [];
        return NextResponse.json(
          { error: "Datos inválidos", details: { issues } },
          { status: 400 },
        );
      }

      const current = await readExactlyOne(code, "draft");
      if (current instanceof NextResponse) return current;
      if (!current) {
        return NextResponse.json({ error: "No se encontró la página legal." }, { status: 404 });
      }
      if (body.expectedUpdatedAt !== current.updatedAt) {
        return NextResponse.json(
          { error: "La página cambió en otra pestaña. Recárgala antes de guardar." },
          { status: 409 },
        );
      }

      if (code === "privacy") {
        const published = await readExactlyOne(code, "published");
        if (published instanceof NextResponse) return published;
        if (published && published.documentId !== current.documentId) return invalidUpstream();
        if (
          published &&
          body.version === published.version &&
          materialPrivacyValue(body) !== materialPrivacyValue(published)
        ) {
          return NextResponse.json(
            {
              error:
                "Cambia la versión antes de publicar modificaciones a la política de privacidad.",
            },
            { status: 409 },
          );
        }
      }

      const data: Partial<LegalBody> = { ...body };
      delete data.expectedUpdatedAt;
      const response = await upstreamFetch(documentUrl(current.documentId), {
        method: "PUT",
        body: JSON.stringify({ data }),
      });
      if (response instanceof NextResponse) return response;
      const json = await readJson(response);
      if (!response.ok) {
        if (json === undefined) return invalidUpstream(response.status);
        return NextResponse.json(json, { status: response.status });
      }
      if (!isRecord(json) || !Object.prototype.hasOwnProperty.call(json, "data")) {
        return invalidUpstream();
      }

      let saved: LegalUpstreamRecord;
      try {
        saved = parseLegalUpstreamRecord(json.data, code);
      } catch {
        return invalidUpstream();
      }
      if (saved.documentId !== current.documentId) return invalidUpstream();

      revalidateTag(LEGAL_PAGE_CACHE_TAG, { expire: 0 });
      return NextResponse.json(json, { status: response.status });
    },
  };
}
