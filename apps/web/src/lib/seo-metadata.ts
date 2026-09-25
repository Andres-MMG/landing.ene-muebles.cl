import type { Metadata } from "next";
import { absoluteSiteUrl, resolveSiteOrigin } from "./site-origin";

export const FALLBACK_SITE_NAME = "ENE-MUEBLES";
export const FALLBACK_ROOT_TITLE = "ENE-MUEBLES · Mobiliario escolar y de oficina";
export const FALLBACK_ROOT_DESCRIPTION =
  "Mobiliario escolar y de oficina certificado para instituciones en Chile. Catálogo, despacho desde la Región de Valparaíso hasta la Región de Los Lagos y cotización en 24 h.";
export const FALLBACK_ROOT_SOCIAL_DESCRIPTION =
  "Mobiliario institucional para aulas, oficinas e instituciones en Chile. Catálogo 2026, despacho desde la Región de Valparaíso hasta la Región de Los Lagos y cotización en 24 h hábiles.";
export const GLOBAL_SHARE_IMAGE_PATH = "/opengraph-image";
export const FALLBACK_SHARE_IMAGE_KICKER = "ENE-MUEBLES · Proveedor institucional";
export const FALLBACK_SHARE_IMAGE_TITLE = "Mobiliario institucional";
export const FALLBACK_SHARE_IMAGE_DESCRIPTION =
  "Catálogo 2026 · Regiones desde Valparaíso hasta Los Lagos · Cotización en 24 h";
export const FALLBACK_SHARE_IMAGE_FOOTER = "ENE-MUEBLES — Fabricación y distribución";
export const FALLBACK_SHARE_IMAGE_ALT =
  "ENE Muebles — Mobiliario institucional · Catálogo · Regiones desde Valparaíso hasta Los Lagos";

export function resolveSeoText(...values: Array<string | null | undefined>): string | undefined {
  for (const value of values) {
    const normalized = value?.trim();
    if (normalized) return normalized;
  }
  return undefined;
}

type SeoMetadataInput = {
  title: string;
  description: string;
  socialDescription?: string;
  path?: string;
  siteName?: string;
  absoluteTitle?: boolean;
  imageUrl?: string;
  imageAlt?: string;
  other?: Record<string, string | number | Array<string | number>>;
};

function absoluteImageUrl(value: string): string {
  try {
    const url = new URL(value);
    if (url.protocol === "http:" || url.protocol === "https:") return url.toString();
  } catch {
    // Root-relative media is resolved against the code-owned origin below.
  }
  return absoluteSiteUrl(value);
}

export function buildSeoMetadata({
  title,
  description,
  socialDescription = description,
  path,
  siteName,
  absoluteTitle = false,
  imageUrl = GLOBAL_SHARE_IMAGE_PATH,
  imageAlt = FALLBACK_SHARE_IMAGE_ALT,
  other,
}: SeoMetadataInput): Metadata {
  const resolvedSiteName = resolveSeoText(siteName) ?? FALLBACK_SITE_NAME;
  const renderedTitle = absoluteTitle ? title : `${title} · ${resolvedSiteName}`;
  const canonicalUrl = path === undefined ? undefined : absoluteSiteUrl(path);
  const resolvedImageUrl = absoluteImageUrl(imageUrl);

  return {
    title: { absolute: renderedTitle },
    applicationName: resolvedSiteName,
    description,
    alternates: { canonical: canonicalUrl ?? null },
    openGraph: {
      type: "website",
      locale: "es_CL",
      siteName: resolvedSiteName,
      ...(canonicalUrl ? { url: canonicalUrl } : {}),
      title: renderedTitle,
      description: socialDescription,
      images: [
        {
          url: resolvedImageUrl,
          width: 1200,
          height: 630,
          alt: imageAlt,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: renderedTitle,
      description: socialDescription,
      images: [resolvedImageUrl],
    },
    ...(other ? { other } : {}),
  };
}

export function metadataBase(): URL {
  return new URL(resolveSiteOrigin());
}
