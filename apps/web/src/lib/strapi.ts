import { site as siteTokens } from "@ene/ui-tokens";

/**
 * Strapi v5 client for the public Next.js frontend.
 *
 * Uses the v5 flat response shape (no `attributes` wrapper). The token
 * is read from `STRAPI_API_TOKEN` and never shipped to the client —
 * every helper below is intended to be called from Server Components
 * or Route Handlers inside the Next.js server runtime.
 *
 * ISR (`revalidate: 60`) is used implicitly via `next: { revalidate: 60 }`.
 * Singleton helpers return typed fallbacks when the CMS is unavailable.
 */
const DEFAULT_STRAPI_URL = "http://localhost:1337";
// Public origin (browser-reachable) used for media URLs. When unset we fall
// back to NEXT_PUBLIC_STRAPI_URL; if that's also unset we derive a sensible
// default from STRAPI_INTERNAL_URL by swapping the docker DNS for localhost.
const PUBLIC_STRAPI_URL_FALLBACK = (() => {
  const internal = process.env.STRAPI_INTERNAL_URL;
  if (!internal) return DEFAULT_STRAPI_URL;
  // e.g. http://cms:1337 -> http://localhost:4781 (local dev maps 4781->1337).
  if (internal.includes("://cms:") || internal.includes("://strapi:")) {
    return "http://localhost:4781";
  }
  return internal;
})();

export const STRAPI_URL =
  process.env.STRAPI_INTERNAL_URL || process.env.NEXT_PUBLIC_STRAPI_URL || DEFAULT_STRAPI_URL;

export const STRAPI_PUBLIC_URL = process.env.NEXT_PUBLIC_STRAPI_URL || PUBLIC_STRAPI_URL_FALLBACK;

const STRAPI_TOKEN = process.env.STRAPI_API_TOKEN || "";

export const REVALIDATE_SECONDS = 60;

export type StrapiMedia = {
  id: number;
  documentId?: string;
  url: string;
  alternativeText?: string | null;
  width?: number | null;
  height?: number | null;
  mime?: string;
  formats?: Record<string, { url: string }>;
};

export type SocialLinks = {
  facebook?: string;
  instagram?: string;
  tiktok?: string;
  linkedin?: string;
};

export type SiteSetting = {
  id?: number;
  documentId?: string;
  siteName: string;
  tagline?: string;
  contactEmail?: string;
  contactPhone?: string;
  whatsappNumber?: string;
  whatsappDefaultMessage?: string;
  address?: string;
  socialLinks?: SocialLinks;
  businessHours?: string;
  aboutText?: string;
  rut?: string;
  heroImage?: StrapiMedia | null;
};

/**
 * Batch 2 marketing-section singletons. Every field is optional
 * because the read helpers return a typed fallback on any failure
 * (network error, Strapi 404, missing record). Consumers must treat
 * any individual field as missing if it is `undefined`/`null` and
 * fall back to per-section defaults baked into each helper.
 */
export type AboutSection = {
  id?: number;
  documentId?: string;
  eyebrow?: string;
  title?: string;
  intro?: string;
  body?: string;
  /**
   * B2 batch 2 fix: kicker (small mono label) is split from the
   * h2 (longer statement) so the public page no longer renders the
   * same string in both slots. Same shape for vision and values.
   */
  missionLabel?: string;
  missionHeading?: string;
  missionBody?: string;
  visionLabel?: string;
  visionHeading?: string;
  visionBody?: string;
  valuesLabel?: string;
  valuesHeading?: string;
  values?: Array<{ title?: string; body?: string }>;
  image?: StrapiMedia | null;
};

export type HeroSection = {
  id?: number;
  documentId?: string;
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  primaryCtaLabel?: string;
  primaryCtaHref?: string;
  secondaryCtaLabel?: string;
  secondaryCtaHref?: string;
  image?: StrapiMedia | null;
};

export type ContactCTASection = {
  id?: number;
  documentId?: string;
  title?: string;
  body?: string;
  buttonLabel?: string;
  buttonHref?: string;
};

export type FooterBlock = {
  id?: number;
  documentId?: string;
  copyrightText?: string;
  tagline?: string;
  legalSnippet?: string;
};

export type Category = {
  id: number;
  documentId?: string;
  name: string;
  slug: string;
  description?: string;
  image?: StrapiMedia | null;
  order?: number;
  active?: boolean;
};

export type Product = {
  id: number;
  documentId?: string;
  name: string;
  slug: string;
  description: string;
  shortDescription?: string;
  price: number;
  currency: string;
  dimensions?: { width?: number; height?: number; depth?: number; weight?: number };
  materials?: string[];
  featured?: boolean;
  active?: boolean;
  order?: number;
  category?: Pick<Category, "id" | "documentId" | "name" | "slug"> | null;
  images?: StrapiMedia[];
  /**
   * Catalog-import (S1) — new optional fields sourced from the Excel
   * importer. Backwards compatible: existing public/admin helpers
   * treat them as `undefined` when Strapi returns null. `subcategory`
   * is held as a string here until the Subcategory content-type ships
   * in a later slice; the importer uses the same string shape so the
   * promotion to a relation is a no-op for callers.
   */
  externalId?: string;
  productType?: string;
  subcategory?: string;
  usageEnvironment?: string;
  observableColor?: string;
  observableMaterial?: string;
  catalogPage?: number;
  confidence?: ProductConfidence;
  source?: string;
  observation?: string;
  /**
   * Catalog-import (S2b) — traceability fields. `importSource` is
   * `'manual'` for products created from the admin form, `'imported'`
   * for products created via the bulk Excel endpoint. `importBatch`
   * points to the batch record that produced this product.
   */
  importSource?: ProductImportSource;
  importBatch?: Pick<ImportBatch, "id" | "documentId" | "fileName" | "uploadedAt"> | null;
  createdAt?: string;
  updatedAt?: string;
  publishedAt?: string | null;
};

/** Catalog-import (S2b) — provenance enum for `Product.importSource`. */
export const PRODUCT_IMPORT_SOURCE_VALUES = ["manual", "imported"] as const;
export type ProductImportSource = (typeof PRODUCT_IMPORT_SOURCE_VALUES)[number];

/** Catalog-import (S2b) — `ImportBatch` audit-trail record. One row
 *  per POST to `/api/admin/products/import`. */
export type ImportBatch = {
  id: number;
  documentId?: string;
  fileName: string;
  uploadedAt: string;
  uploadedByEmail?: string;
  totalRows?: number;
  createdCount?: number;
  updatedCount?: number;
  failedCount?: number;
  importSource: "imported";
  importedProductIds?: number[];
  importedProducts?: Array<Pick<Product, "id" | "documentId" | "name" | "externalId">>;
};

/**
 * Catalog-import (S1) — confidence enum carried over from the Excel
 * `Certeza` column. `baja` and `revision-manual` are both valid sinks
 * for unmapped values; the importer prefers `revision-manual` per
 * the design contract in `openspec/changes/catalog-excel-import/design.md`.
 */
export const PRODUCT_CONFIDENCE_VALUES = [
  "alta",
  "media-variante-visual",
  "media-nombre-generico-pdf",
  "baja",
  "revision-manual",
] as const;

export type ProductConfidence = (typeof PRODUCT_CONFIDENCE_VALUES)[number];

export const PRODUCT_TYPE_VALUES = [
  "Silla",
  "Mesa",
  "Escritorio",
  "Banca",
  "Piso",
  "Cuna",
] as const;

export type ProductType = (typeof PRODUCT_TYPE_VALUES)[number];

type CollectionEnvelope<T> = { data: T[]; meta?: unknown };
type SingleEnvelope<T> = { data: T; meta?: unknown };

const buildHeaders = (): HeadersInit => {
  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (STRAPI_TOKEN) headers.Authorization = `Bearer ${STRAPI_TOKEN}`;
  return headers;
};

const ensureAbsoluteUrl = (url: string): string => {
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("/")) return `${STRAPI_PUBLIC_URL.replace(/\/+$/, "")}${url}`;
  return `${STRAPI_PUBLIC_URL.replace(/\/+$/, "")}/${url}`;
};

const requireField = <T>(value: T | null | undefined, name: string): T => {
  if (value === null || value === undefined) {
    throw new Error(`[strapi] Missing required field: ${name}`);
  }
  return value;
};

class StrapiResponseError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body: string,
  ) {
    super(message);
    this.name = "StrapiResponseError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${STRAPI_URL.replace(/\/+$/, "")}${path}`;
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers: { ...buildHeaders(), ...(init?.headers || {}) },
      next: { revalidate: REVALIDATE_SECONDS },
    });
  } catch (err) {
    throw new Error(`[strapi] Network error contacting ${url}: ${(err as Error).message}`);
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new StrapiResponseError(
      `[strapi] ${init?.method || "GET"} ${path} failed: ${res.status} ${res.statusText} ${body}`,
      res.status,
      body,
    );
  }

  try {
    return (await res.json()) as T;
  } catch (err) {
    throw new Error(`[strapi] Invalid JSON response from ${path}: ${(err as Error).message}`);
  }
}

const normalizeMedia = (media: any): StrapiMedia | null => {
  if (!media) return null;
  if (Array.isArray(media)) {
    const first = media[0];
    return first ? normalizeMedia(first) : null;
  }
  const url = media.url || media?.formats?.thumbnail?.url || media?.formats?.small?.url;
  if (!url) return null;
  return {
    id: media.id,
    documentId: media.documentId,
    url: ensureAbsoluteUrl(url),
    alternativeText: media.alternativeText ?? null,
    width: media.width ?? null,
    height: media.height ?? null,
    mime: media.mime,
    formats: media.formats,
  };
};

const normalizeImageList = (images: any): StrapiMedia[] => {
  if (!images) return [];
  if (!Array.isArray(images)) return [];
  return images.map(normalizeMedia).filter((m): m is StrapiMedia => m !== null);
};

export async function getSiteSettings(): Promise<SiteSetting> {
  try {
    const json = await request<SingleEnvelope<unknown> | unknown>("/api/site-setting?populate=*");
    if (!isRecord(json) || !("data" in json)) {
      throw new Error("[strapi] getSiteSettings: malformed response envelope");
    }
    return normalizeSiteSettings(json.data);
  } catch (err) {
    if (err instanceof StrapiResponseError && isMissingSingletonNotFound(err)) {
      return FALLBACK_SITE_SETTINGS;
    }
    throw err;
  }
}

const FALLBACK_SITE_SETTINGS: SiteSetting = {
  siteName: "Ene Muebles",
};

const PENDING_RUT_SENTINEL = "Pending confirmation";

export function getPublicRut(rut: string | null | undefined): string | undefined {
  const normalized = rut?.trim();
  return normalized && normalized !== PENDING_RUT_SENTINEL ? normalized : undefined;
}

function isMissingSingletonNotFound(error: StrapiResponseError): boolean {
  if (error.status !== 404) return false;

  try {
    const payload: unknown = JSON.parse(error.body);
    return (
      isRecord(payload) &&
      payload.data === null &&
      isRecord(payload.error) &&
      payload.error.name === "NotFoundError" &&
      payload.error.status === 404
    );
  } catch {
    return false;
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function optionalString(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === "string") return value;
  throw new Error(`[strapi] getSiteSettings: malformed ${field}`);
}

function normalizeSiteSettings(raw: unknown): SiteSetting {
  if (!isRecord(raw) || typeof raw.siteName !== "string" || raw.siteName.trim() === "") {
    throw new Error("[strapi] getSiteSettings: malformed data");
  }

  if (raw.id !== undefined && typeof raw.id !== "number") {
    throw new Error("[strapi] getSiteSettings: malformed id");
  }

  const socialLinksValue = raw.socialLinks;
  const socialLinks =
    socialLinksValue === undefined || socialLinksValue === null
      ? undefined
      : isRecord(socialLinksValue) &&
          Object.values(socialLinksValue).every((value) => typeof value === "string")
        ? socialLinksValue
        : (() => {
            throw new Error("[strapi] getSiteSettings: malformed socialLinks");
          })();

  const heroImage = raw.heroImage;
  if (heroImage !== undefined && heroImage !== null && normalizeMedia(heroImage) === null) {
    throw new Error("[strapi] getSiteSettings: malformed heroImage");
  }

  return {
    id: raw.id,
    documentId: optionalString(raw.documentId, "documentId"),
    siteName: raw.siteName.trim(),
    tagline: optionalString(raw.tagline, "tagline"),
    contactEmail: optionalString(raw.contactEmail, "contactEmail"),
    contactPhone: optionalString(raw.contactPhone, "contactPhone"),
    whatsappNumber: optionalString(raw.whatsappNumber, "whatsappNumber"),
    whatsappDefaultMessage: optionalString(raw.whatsappDefaultMessage, "whatsappDefaultMessage"),
    address: optionalString(raw.address, "address"),
    socialLinks,
    businessHours: optionalString(raw.businessHours, "businessHours"),
    aboutText: optionalString(raw.aboutText, "aboutText"),
    rut: optionalString(raw.rut, "rut"),
    heroImage: normalizeMedia(heroImage),
  };
}

/**
 * Batch 2 marketing-section singletons. The four helpers below all
 * share the same contract: read the singleton via `populate=*`, return
 * the safe fallback when Strapi responds with 404 / null / missing
 * data, and normalize any media field through `normalizeMedia`. The
 * never-throw contract lets server components `await` these without a
 * try/catch — the helper either returns real CMS data or returns the
 * hardcoded fallback that mirrors what `AboutSection`, `Hero`,
 * `ContactCTA`, and `Footer` used to render before the migration.
 *
 * Fallback values come from `@ene/ui-tokens/site` so there is exactly
 * one copy of the literal strings; the tokens stay the source of truth
 * for any copy that is reused elsewhere on the marketing pages.
 */

const FALLBACK_ABOUT: AboutSection = {
  eyebrow: siteTokens.aboutOverline,
  title: siteTokens.aboutHeading,
  intro: siteTokens.aboutIntro,
  missionLabel: siteTokens.missionLabel,
  missionHeading: siteTokens.missionHeading,
  missionBody: siteTokens.missionBody,
  visionLabel: siteTokens.visionLabel,
  visionHeading: siteTokens.visionHeading,
  visionBody: siteTokens.visionBody,
  valuesLabel: siteTokens.valuesLabel,
  valuesHeading: siteTokens.valuesHeading,
  values: siteTokens.values.map((v) => ({ title: v.title, body: v.body })),
  image: null,
};

const FALLBACK_HERO: HeroSection = {
  eyebrow: `${siteTokens.brand} · Proveedor institucional`,
  title: siteTokens.promise,
  subtitle:
    "Sillas, escritorios, estanterías y mesones para colegios, universidades, municipalidades y oficinas. Melamina 18 mm, cantos PVC termosellados, estructura reforzada. Catálogo certificado, despacho a todo Chile y garantía escrita.",
  primaryCtaLabel: siteTokens.catalogAll,
  primaryCtaHref: "/catalogo",
  secondaryCtaLabel: siteTokens.quoteCta,
  secondaryCtaHref: "#contacto",
  image: null,
};

const FALLBACK_CONTACT_CTA: ContactCTASection = {
  title: siteTokens.contactHeading,
  body: siteTokens.contactBody,
  buttonLabel: siteTokens.whatsappCta,
  buttonHref: undefined,
};

function currentYearCopyright(): string {
  return `© ${new Date().getFullYear()} ${siteTokens.brand}`;
}

export async function getAboutSection(): Promise<AboutSection> {
  try {
    const json = await request<SingleEnvelope<AboutSection> | { data: null }>(
      "/api/about-section?populate=*",
    );
    const raw = (json as { data?: AboutSection | null }).data;
    if (!raw) return FALLBACK_ABOUT;
    return { ...raw, image: normalizeMedia(raw.image) };
  } catch {
    return FALLBACK_ABOUT;
  }
}

export async function getHeroSection(): Promise<HeroSection> {
  try {
    const json = await request<SingleEnvelope<HeroSection> | { data: null }>(
      "/api/hero-section?populate=*",
    );
    const raw = (json as { data?: HeroSection | null }).data;
    if (!raw) return FALLBACK_HERO;
    return { ...raw, image: normalizeMedia(raw.image) };
  } catch {
    return FALLBACK_HERO;
  }
}

export async function getContactCTASection(): Promise<ContactCTASection> {
  try {
    const json = await request<SingleEnvelope<ContactCTASection> | { data: null }>(
      "/api/contact-cta-section?populate=*",
    );
    const raw = (json as { data?: ContactCTASection | null }).data;
    if (!raw) return FALLBACK_CONTACT_CTA;
    return raw;
  } catch {
    return FALLBACK_CONTACT_CTA;
  }
}

export async function getFooterBlock(): Promise<FooterBlock> {
  try {
    const json = await request<SingleEnvelope<FooterBlock> | { data: null }>("/api/footer-block");
    const raw = (json as { data?: FooterBlock | null }).data;
    if (!raw) {
      return {
        copyrightText: currentYearCopyright(),
        tagline: undefined,
        legalSnippet: "Proveedor institucional · Chile",
      };
    }
    return raw;
  } catch {
    return {
      copyrightText: currentYearCopyright(),
      tagline: undefined,
      legalSnippet: "Proveedor institucional · Chile",
    };
  }
}

/**
 * Exported for tests and for callers that need to surface the literal
 * fallback copy (e.g. the admin UI's "preview default copy" hint).
 * Same data the helpers return when Strapi is unreachable.
 */
export const __sectionFallbacks = {
  about: FALLBACK_ABOUT,
  hero: FALLBACK_HERO,
  contactCta: FALLBACK_CONTACT_CTA,
};

/**
 * Per-section fallback factories. Each function returns a freshly
 * allocated object so callers may safely mutate it. The public read
 * helpers (`getHeroSection`, `getAboutSection`, `getContactCTASection`,
 * `getFooterBlock`) return values equivalent to these factories when
 * Strapi responds with `data: null`, an empty object, or the request
 * fails.
 *
 * The admin pages reuse the same factories so an editor opening
 * `/admin/hero` for the first time sees the same copy the public
 * site currently renders — not blank inputs. When the editor saves
 * a non-empty value the singleton becomes real, the next admin page
 * load returns the saved value, and the fallback is no longer
 * consulted until the editor clears the field again.
 *
 * `footer()` is a function (not a constant) because the copyright
 * text embeds the current calendar year. The other three are also
 * functions for a consistent API: callers always invoke the
 * factory rather than dereference a property.
 */
export const sectionFallbacks = {
  hero: (): HeroSection => ({ ...FALLBACK_HERO }),
  about: (): AboutSection => ({ ...FALLBACK_ABOUT }),
  contactCta: (): ContactCTASection => ({ ...FALLBACK_CONTACT_CTA }),
  footer: (): FooterBlock => ({
    copyrightText: currentYearCopyright(),
    tagline: undefined,
    legalSnippet: "Proveedor institucional · Chile",
  }),
};

/**
 * Resolve an upstream Strapi v5 singleton payload to a non-null
 * value. Returns the `fallback` when the upstream `data` is null,
 * undefined, or an empty object (`{}`). Otherwise returns the
 * upstream data verbatim.
 *
 * Used by the admin pages to apply the same fallback the public
 * read helpers apply when the singleton has not been seeded yet.
 * Without this resolver, the admin page would render blank inputs
 * when Strapi has not saved a record for the singleton, even
 * though the public site renders the typed fallback copy.
 */
export function resolveSection<T extends Record<string, unknown>>(
  data: T | null | undefined,
  fallback: T,
): T {
  if (!data || typeof data !== "object" || Object.keys(data).length === 0) {
    return fallback;
  }
  return data;
}

export async function getCategories(): Promise<Category[]> {
  const json = await request<CollectionEnvelope<Category>>(
    "/api/categories?filters[active][$eq]=true&sort=order&populate=*",
  );
  return (json.data ?? []).map((c) => ({
    ...c,
    image: normalizeMedia(c.image),
  }));
}

export async function getFeaturedProducts(limit = 6): Promise<Product[]> {
  // Prefer products flagged as `featured`. If none are flagged yet, fall
  // back to the most recently published active products so the home page
  // never renders an empty section while the catalog is still being curated.
  const featured = await request<CollectionEnvelope<Product>>(
    `/api/products?filters[featured][$eq]=true&filters[active][$eq]=true&populate=*&pagination[limit]=${limit}&sort=publishedAt:desc`,
  );
  const featuredData = (featured.data ?? []).map(normalizeProduct);
  if (featuredData.length > 0) return featuredData;

  const fallback = await request<CollectionEnvelope<Product>>(
    `/api/products?filters[active][$eq]=true&populate=*&pagination[limit]=${limit}&sort=publishedAt:desc`,
  );
  return (fallback.data ?? []).map(normalizeProduct);
}

export async function getProducts(categorySlug?: string): Promise<Product[]> {
  const params = new URLSearchParams();
  params.set("filters[active][$eq]", "true");
  params.set("sort", "order");
  params.set("populate", "*");
  if (categorySlug) {
    params.set("filters[category][slug][$eq]", categorySlug);
  }
  const json = await request<CollectionEnvelope<Product>>(`/api/products?${params.toString()}`);
  return (json.data ?? []).map(normalizeProduct);
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const json = await request<CollectionEnvelope<Product>>(
    `/api/products?filters[slug][$eq]=${encodeURIComponent(slug)}&populate=*`,
  );
  const raw = json.data?.[0];
  if (!raw) return null;
  return normalizeProduct(raw);
}

function normalizeProduct(raw: any): Product {
  const category = raw.category
    ? {
        id: raw.category.id,
        documentId: raw.category.documentId,
        name: raw.category.name,
        slug: raw.category.slug,
      }
    : null;
  // S2b: importSource is an enum, importBatch is a relation. Both are
  // optional and may be missing/null for products that pre-date the
  // catalog-import feature.
  const importSource: ProductImportSource | undefined =
    typeof raw.importSource === "string" &&
    (PRODUCT_IMPORT_SOURCE_VALUES as readonly string[]).includes(raw.importSource)
      ? (raw.importSource as ProductImportSource)
      : undefined;
  const importBatch =
    raw.importBatch && typeof raw.importBatch === "object"
      ? {
          id: raw.importBatch.id,
          documentId: raw.importBatch.documentId,
          fileName: raw.importBatch.fileName,
          uploadedAt: raw.importBatch.uploadedAt,
        }
      : raw.importBatch === null
        ? null
        : undefined;
  return {
    id: raw.id,
    documentId: raw.documentId,
    name: requireField(raw.name, "product.name"),
    slug: requireField(raw.slug, "product.slug"),
    description: requireField(raw.description, "product.description"),
    shortDescription: raw.shortDescription,
    price: typeof raw.price === "number" ? raw.price : Number(raw.price),
    currency: raw.currency || "CLP",
    dimensions: raw.dimensions,
    materials: raw.materials,
    featured: Boolean(raw.featured),
    active: raw.active !== false,
    order: raw.order ?? 0,
    category,
    images: normalizeImageList(raw.images),
    externalId: raw.externalId ?? undefined,
    productType: raw.productType ?? undefined,
    subcategory: raw.subcategory ?? undefined,
    usageEnvironment: raw.usageEnvironment ?? undefined,
    observableColor: raw.observableColor ?? undefined,
    observableMaterial: raw.observableMaterial ?? undefined,
    catalogPage:
      typeof raw.catalogPage === "number"
        ? raw.catalogPage
        : raw.catalogPage == null
          ? undefined
          : Number(raw.catalogPage),
    confidence:
      typeof raw.confidence === "string" &&
      (PRODUCT_CONFIDENCE_VALUES as readonly string[]).includes(raw.confidence)
        ? (raw.confidence as ProductConfidence)
        : undefined,
    source: raw.source ?? undefined,
    observation: raw.observation ?? undefined,
    importSource,
    importBatch,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    publishedAt: raw.publishedAt,
  };
}

export const formatPrice = (product: Pick<Product, "price" | "currency">): string => {
  const value = typeof product.price === "number" ? product.price : Number(product.price);
  if (!Number.isFinite(value)) return "";
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: product.currency || "CLP",
    maximumFractionDigits: 0,
  }).format(value);
};

export const buildWhatsAppLink = (number: string, message: string): string => {
  const sanitized = (number || "").replace(/[^0-9+]/g, "");
  return `https://wa.me/${sanitized.replace(/^\+/, "")}?text=${encodeURIComponent(message)}`;
};

// Internal helpers reused by tests.
export const __internal = {
  buildHeaders,
  normalizeMedia,
  normalizeImageList,
  ensureAbsoluteUrl,
};
