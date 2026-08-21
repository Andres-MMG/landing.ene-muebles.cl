/** Regions where new leads can currently be accepted. */
export const SUPPORTED_REGIONS = [
  "Valparaíso",
  "Metropolitana",
  "O'Higgins",
  "Maule",
  "Ñuble",
  "Biobío",
  "La Araucanía",
  "Los Ríos",
  "Los Lagos",
] as const;

export type SupportedRegion = (typeof SUPPORTED_REGIONS)[number];

const supportedRegionSet = new Set<string>(SUPPORTED_REGIONS);

export const isSupportedRegion = (value: unknown): value is SupportedRegion =>
  typeof value === "string" && supportedRegionSet.has(value);

/** The label shown to visitors for a lead without product context. */
export const GENERAL_PRODUCT_LABEL = "Pregunta general";

/**
 * Product slugs are transient request context. Only a normalized slug can
 * reach a server-side product lookup; the submitted product name is never a
 * trusted attribution value.
 */
export const normalizeProductSlug = (value: unknown): string | null => {
  if (typeof value !== "string") return null;

  const slug = value.trim();
  if (
    slug.length === 0 ||
    slug.length > 200 ||
    slug.toLocaleLowerCase("es-CL") === GENERAL_PRODUCT_LABEL.toLocaleLowerCase("es-CL") ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)
  ) {
    return null;
  }

  return slug;
};

/** Alias expressing that this value is request context, not a snapshot. */
export const normalizeProductContext = normalizeProductSlug;
