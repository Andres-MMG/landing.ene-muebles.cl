import type { Product } from './strapi';

/**
 * Catalog-import (S4) — pure helpers that turn a `Product` into the
 * metadata + structured-data payloads the public product page and the
 * sitemap need. Kept in a leaf module so unit tests can exercise
 * every branch without rendering React.
 *
 * Why pure:
 *   - `buildMetaDescription` is reused for both `<meta name="description">`
 *     and `openGraph.description`, with different length caps.
 *   - `buildJsonLdAdditionalProperty` powers the schema.org payload
 *     and any future sitemap payload.
 *   - `buildSpecsStrip` powers the visual strip under the price.
 *
 * Every helper treats every field as optional — Strapi may return
 * `null`/`undefined` for any of them. Callers MUST skip rendering
 * when the returned value is null/empty.
 */

export const META_DESCRIPTION_MAX = 280;
export const OG_DESCRIPTION_MAX = 200;

/** Trim a string to a maximum length without leaving trailing
 *  whitespace or breaking inside a word when possible. */
function trimToLength(text: string, max: number): string {
  if (text.length <= max) return text;
  const slice = text.slice(0, max);
  // Drop a trailing partial word so we never expose half a token.
  return slice.replace(/\s+\S*$/, '').trimEnd();
}

/**
 * Compose the meta description: `shortDescription` first, then each
 * populated attribute separated by ` · `. Trims to ≤ `max` characters.
 * Returns `null` when the product has no description material at all
 * so the caller can fall back to a placeholder.
 */
export function buildMetaDescription(
  product: Pick<
    Product,
    | 'shortDescription'
    | 'subcategory'
    | 'observableColor'
    | 'observableMaterial'
    | 'usageEnvironment'
  >,
  max: number = META_DESCRIPTION_MAX
): string | null {
  const parts: string[] = [];
  const short = product.shortDescription?.trim();
  if (short) parts.push(short);
  if (product.subcategory?.trim()) parts.push(`Subcategoría: ${product.subcategory.trim()}`);
  if (product.observableColor?.trim()) parts.push(`Color: ${product.observableColor.trim()}`);
  if (product.observableMaterial?.trim())
    parts.push(`Material: ${product.observableMaterial.trim()}`);
  if (product.usageEnvironment?.trim())
    parts.push(`Uso: ${product.usageEnvironment.trim()}`);
  if (parts.length === 0) return null;
  return trimToLength(parts.join(' · '), max);
}

/** `theme-color` meta tag value. Picks a neutral ink tone that matches
 *  the public site's paper-on-ink palette. */
export const THEME_COLOR = '#1a1a1a';

/**
 * Build the array of schema.org `PropertyValue` entries the Product
 * JSON-LD payload should carry. Returns an empty array when no
 * catalog-import field is populated so the caller can omit the key
 * instead of shipping an empty `additionalProperty`.
 */
export type JsonLdProperty = {
  '@type': 'PropertyValue';
  name: string;
  value: string | number;
};

export function buildJsonLdAdditionalProperty(
  product: Pick<
    Product,
    | 'productType'
    | 'subcategory'
    | 'usageEnvironment'
    | 'observableColor'
    | 'observableMaterial'
    | 'catalogPage'
  >
): JsonLdProperty[] {
  const out: JsonLdProperty[] = [];
  if (product.productType?.trim()) {
    out.push({ '@type': 'PropertyValue', name: 'productType', value: product.productType.trim() });
  }
  if (product.subcategory?.trim()) {
    out.push({ '@type': 'PropertyValue', name: 'subcategory', value: product.subcategory.trim() });
  }
  if (product.usageEnvironment?.trim()) {
    out.push({
      '@type': 'PropertyValue',
      name: 'usageEnvironment',
      value: product.usageEnvironment.trim(),
    });
  }
  if (product.observableColor?.trim()) {
    out.push({
      '@type': 'PropertyValue',
      name: 'observableColor',
      value: product.observableColor.trim(),
    });
  }
  if (product.observableMaterial?.trim()) {
    out.push({
      '@type': 'PropertyValue',
      name: 'observableMaterial',
      value: product.observableMaterial.trim(),
    });
  }
  if (typeof product.catalogPage === 'number' && product.catalogPage > 0) {
    out.push({
      '@type': 'PropertyValue',
      name: 'catalogPage',
      value: product.catalogPage,
    });
  }
  return out;
}

/**
 * B1 (T5) — parsed measurements in the catalog's canonical order:
 * Ancho x Alto x Profundidad, all in cm. `parseDimensions` merges the
 * structured width/height/depth fields when present and otherwise
 * falls back to the raw `dimensions.source` string written by the
 * Excel importer (e.g. `"49cm x 65cm x 42cm"` or `"49x65x42"`).
 * Returns `null` when nothing usable is available so callers can skip
 * rendering instead of showing a partial readout.
 */
export type ParsedDimensions = { width?: number; height?: number; depth?: number };

const parseNumber = (raw: string): number | null => {
  const normalized = raw.replace(",", ".");
  const value = Number.parseFloat(normalized);
  return Number.isFinite(value) && value > 0 ? value : null;
};

const SOURCE_DIMENSION_RE =
  /^\s*(\d+(?:[.,]\d+)?)\s*(?:cm)?\s*[xX×]\s*(\d+(?:[.,]\d+)?)\s*(?:cm)?\s*[xX×]\s*(\d+(?:[.,]\d+)?)\s*(?:cm)?\s*$/;

export function parseDimensions(
  dimensions: Pick<Product, "dimensions">["dimensions"] | null | undefined,
): ParsedDimensions | null {
  // Structured fields win: the admin UI and any future importer write
  // width/height/depth directly. At least one positive value is enough
  // to consider the structured shape authoritative.
  if (dimensions && typeof dimensions === "object") {
    const structured: ParsedDimensions = {};
    if (typeof dimensions.width === "number" && dimensions.width > 0)
      structured.width = dimensions.width;
    if (typeof dimensions.height === "number" && dimensions.height > 0)
      structured.height = dimensions.height;
    if (typeof dimensions.depth === "number" && dimensions.depth > 0)
      structured.depth = dimensions.depth;
    if (structured.width !== undefined || structured.height !== undefined || structured.depth !== undefined) {
      return structured;
    }
    // Fall through to the raw source string when the structured shape
    // is present but empty (e.g. only `weight` populated).
    const source = dimensions.source?.trim();
    if (source) {
      const match = SOURCE_DIMENSION_RE.exec(source);
      if (!match) return null;
      const [w, h, d] = [parseNumber(match[1]), parseNumber(match[2]), parseNumber(match[3])];
      if (w === null || h === null || d === null) return null;
      return { width: w, height: h, depth: d };
    }
    return null;
  }
  return null;
}

/**
 * Format the product's measurements as a single compact Spanish row:
 * `"49 x 65 x 42 cm"` (Ancho x Alto x Profundidad). Returns `null`
 * when the product has no parseable dimensions so callers can skip
 * the row entirely.
 */
export function formatDimensions(
  product: Pick<Product, "dimensions">,
): string | null {
  const parsed = parseDimensions(product.dimensions);
  if (!parsed) return null;
  const parts = [parsed.width, parsed.height, parsed.depth]
    .filter((n): n is number => n !== undefined)
    .map((n) => String(n));
  return parts.length > 0 ? `${parts.join(" x ")} cm` : null;
}

/**
 * A spec entry rendered under the price. `label` is the human-readable
 * micro-label shown in `t-mono`; `value` is the actual observation.
 * Only entries with a non-empty value are emitted by `buildSpecsStrip`.
 */
export type SpecStripEntry = { label: string; value: string };

/**
 * Compose the under-the-price specs strip. Only populated fields are
 * emitted; the visual system uses the existing hairline border + mono
 * label so the strip inherits the page's typography without a new
 * component. Returns an empty array when nothing is populated.
 */
export function buildSpecsStrip(
  product: Pick<
    Product,
    | 'productType'
    | 'subcategory'
    | 'observableColor'
    | 'observableMaterial'
    | 'usageEnvironment'
    | 'dimensions'
  >
): SpecStripEntry[] {
  const out: SpecStripEntry[] = [];
  if (product.productType?.trim())
    out.push({ label: 'Qué es', value: product.productType.trim() });
  // B1 (T5) — measurements join the strip ahead of the descriptive
  // fields; they are the institutional sell for institutional buyers.
  const dimensions = formatDimensions(product);
  if (dimensions) out.push({ label: 'Medidas', value: dimensions });
  if (product.subcategory?.trim())
    out.push({ label: 'Subcategoría', value: product.subcategory.trim() });
  if (product.observableColor?.trim())
    out.push({ label: 'Color', value: product.observableColor.trim() });
  if (product.observableMaterial?.trim())
    out.push({ label: 'Material', value: product.observableMaterial.trim() });
  if (product.usageEnvironment?.trim())
    out.push({ label: 'Uso', value: product.usageEnvironment.trim() });
  return out;
}

/**
 * Image-title for the sitemap: `productType · subcategory · color` when
 * available, falling back to `name` alone when none of the
 * catalog-import fields is populated. Returns the string verbatim;
 * the caller is responsible for placing it inside
 * `<image:image><image:title>` (or `<image:title>` per Next's sitemap
 * type system — see `apps/web/src/app/sitemap.ts`).
 */
export function buildSitemapImageTitle(
  product: Pick<
    Product,
    'name' | 'productType' | 'subcategory' | 'observableColor'
  >
): string {
  const parts: string[] = [];
  if (product.productType?.trim()) parts.push(product.productType.trim());
  if (product.subcategory?.trim()) parts.push(product.subcategory.trim());
  if (product.observableColor?.trim()) parts.push(product.observableColor.trim());
  return parts.length > 0 ? parts.join(' · ') : product.name;
}

/**
 * Build the `Product` JSON-LD payload that ships to the public page.
 * Strictly additive: every previously-existing field is preserved
 * verbatim; the catalog-import fields are appended as `additionalProperty`.
 *
 * B2/U12 — `offers` is emitted ONLY when the product carries a
 * VERIFIED offer (see `hasVerifiedOffer`): a finite price > 0 with CLP
 * currency. Zero/empty/NaN prices are hidden by the UI, so the
 * structured data must not contradict the visible page (seo-geo-aeo
 * spec). `aggregateRating` and `Review` are NEVER emitted. Callers
 * MUST pass published products only — the public `getProductBySlug`
 * already filters by `publishedAt`; this builder does not re-check
 * publication state.
 */
export const PRODUCT_CURRENCY_DEFAULT = "CLP";

/**
 * True when the product has an offer that may be published: price is a
 * finite number strictly greater than zero AND the currency is CLP
 * (case-insensitive; missing/empty currency defaults to CLP exactly
 * like `formatPrice` in `lib/strapi.ts`).
 */
export function hasVerifiedOffer(
  product: Pick<Product, "price" | "currency">
): boolean {
  if (
    typeof product.price !== "number" ||
    !Number.isFinite(product.price) ||
    product.price <= 0
  ) {
    return false;
  }
  const currency =
    product.currency?.trim().toUpperCase() || PRODUCT_CURRENCY_DEFAULT;
  return currency === PRODUCT_CURRENCY_DEFAULT;
}

export function buildProductJsonLd(
  product: Product,
  siteUrl: string
): Record<string, unknown> {
  const base: Record<string, unknown> = {
    '@context': 'https://schema.org/',
    '@type': 'Product',
    name: product.name,
    description: product.shortDescription || product.description,
    image: product.images?.map((i) =>
      i.url.startsWith('http') ? i.url : `${siteUrl}${i.url}`
    ),
    category: product.category?.name,
    brand: { '@type': 'Brand', name: 'ENE-MUEBLES' },
  };
  // B2/U12 — omit offers (and with them availability) unless the price
  // is verified and visible. Matches the UI: `price > 0` gates the
  // rendered price on both the card and the product page.
  if (hasVerifiedOffer(product)) {
    base.offers = {
      '@type': 'Offer',
      url: `${siteUrl}/producto/${product.slug}`,
      price: product.price,
      priceCurrency:
        product.currency?.trim().toUpperCase() || PRODUCT_CURRENCY_DEFAULT,
      availability: 'https://schema.org/InStock',
      seller: { '@type': 'Organization', name: 'ENE-MUEBLES' },
    };
  }
  const additional = buildJsonLdAdditionalProperty(product);
  if (additional.length > 0) base.additionalProperty = additional;
  return base;
}
