import { getStrapiAdminToken } from "@/lib/admin/strapi-admin";
import { parseLegalUpstreamRecord, type LegalCode } from "@/lib/legal-pages";
import type { LegalFormValues } from "../LegalForm";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function getLegalPageForAdmin(code: LegalCode): Promise<LegalFormValues> {
  const base = (process.env.STRAPI_INTERNAL_URL ?? "http://cms:1337").replace(/\/+$/, "");
  const params = new URLSearchParams({
    "filters[code][$eq]": code,
    status: "draft",
    "pagination[pageSize]": "2",
    "populate[sections][populate][paragraphs]": "true",
  });
  const response = await fetch(`${base}/api/legal-pages?${params.toString()}`, {
    headers: { Authorization: `Bearer ${getStrapiAdminToken()}` },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`No se pudo cargar la página legal (${response.status})`);

  const json: unknown = await response.json();
  if (!isRecord(json) || !Array.isArray(json.data) || json.data.length !== 1) {
    throw new Error("La página legal no tiene una identidad única.");
  }

  let record;
  try {
    record = parseLegalUpstreamRecord(json.data[0], code);
  } catch {
    throw new Error("El servidor de contenido devolvió una página legal inválida.");
  }

  return {
    metadataTitle: record.metadataTitle ?? "",
    metadataDescription: record.metadataDescription ?? "",
    eyebrow: record.eyebrow,
    title: record.title,
    intro: record.intro,
    tocLabel: record.tocLabel,
    updatedLabel: record.updatedLabel,
    effectiveDate: record.effectiveDate,
    version: record.version,
    updatedAt: record.updatedAt,
    sections: record.sections,
  };
}
