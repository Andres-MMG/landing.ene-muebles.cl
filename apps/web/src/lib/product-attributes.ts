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
  >
): SpecStripEntry[] {
  const out: SpecStripEntry[] = [];
  if (product.productType?.trim())
    out.push({ label: 'Qué es', value: product.productType.trim() });
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
 */
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
    brand: { '@type': 'Brand', name: 'Ene Muebles' },
    offers: {
      '@type': 'Offer',
      url: `${siteUrl}/producto/${product.slug}`,
      price: product.price,
      priceCurrency: product.currency,
      availability: 'https://schema.org/InStock',
      seller: { '@type': 'Organization', name: 'Ene Muebles' },
    },
  };
  const additional = buildJsonLdAdditionalProperty(product);
  if (additional.length > 0) base.additionalProperty = additional;
  return base;
}
