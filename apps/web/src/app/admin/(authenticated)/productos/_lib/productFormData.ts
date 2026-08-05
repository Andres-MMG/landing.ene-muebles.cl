/**
 * Catalog-import (S4) — payload builder + initial-state builder for the
 * admin product form (`ProductForm.tsx`).
 *
 * Extracted so the wire format and the field list are testable without
 * rendering React. Mirrors the same separation pattern as
 * `SiteSettingForm.buildSubmitPayload`.
 *
 * Pure functions only. No React, no `useState`, no fetch.
 */

/** The form's input shape — every catalog-import field is optional
 *  because Strapi may return null for any of them. */
export type ProductFormValues = {
  documentId: string | null;
  name: string;
  slug: string;
  shortDescription: string;
  description: string;
  price: string;
  currency: string;
  category: string;
  active: boolean;
  featured: boolean;
  /** Catalog-import (S1) — 10 fields. */
  externalId: string;
  productType: string;
  subcategory: string;
  usageEnvironment: string;
  observableColor: string;
  observableMaterial: string;
  catalogPage: string;
  confidence: string;
  source: string;
  observation: string;
  /** Catalog-import (S2b) — read-only metadata rendered as a badge. */
  importSource: "manual" | "imported" | "";
  importBatchFileName: string;
  importBatchUploadedAt: string;
};

/** The wire payload the form POSTs / PUTs. Mirrors the existing
 *  `/api/admin/products` route contract (zod schema in `route.ts`)
 *  with new catalog-import fields appended as optional entries.
 *  Pass-through — Strapi ignores unknown fields. */
export type ProductSubmitPayload = Record<string, unknown>;

/** Build the JSON body sent to `POST /api/admin/products` or
 *  `PATCH /api/admin/products/{id}`. Required fields are always sent
 *  (trimmed). Optional scalars are sent when non-empty; when a blank
 *  input means the operator cleared the field, we send `null` so
 *  Strapi v5 clears the stored value instead of keeping the old one.
 *  `category` is sent as `null` when the operator picked
 *  `— Sin categoría —` so the relation is disconnected.
 *  `confidence` is sent verbatim when set so the route's zod enum
 *  check (`'alta' | 'media-variante-visual' | ...`) does not reject
 *  an unknown value — Strapi will store whatever the operator typed
 *  as a free-form string until the schema promotes it to enum. */
export function buildProductSubmitPayload(v: ProductFormValues): ProductSubmitPayload {
  const payload: ProductSubmitPayload = {
    name: v.name.trim(),
    description: v.description.trim(),
    price: Number(v.price),
    currency: v.currency.trim() || "CLP",
    active: v.active,
    featured: v.featured,
  };
  if (v.shortDescription.trim()) payload.shortDescription = v.shortDescription.trim();
  else payload.shortDescription = null;
  if (v.category) payload.category = v.category;
  else payload.category = null;
  if (v.slug.trim()) payload.slug = v.slug.trim();

  // Catalog-import (S1) — optional fields. Blank input clears the
  // stored value with null; non-empty values are trimmed and kept.
  payload.externalId = v.externalId.trim() || null;
  if (v.productType) payload.productType = v.productType;
  else payload.productType = null;
  payload.subcategory = v.subcategory.trim() || null;
  payload.usageEnvironment = v.usageEnvironment.trim() || null;
  payload.observableColor = v.observableColor.trim() || null;
  payload.observableMaterial = v.observableMaterial.trim() || null;
  if (v.catalogPage.trim()) {
    const page = Number(v.catalogPage);
    if (Number.isFinite(page) && page >= 1) payload.catalogPage = page;
    else payload.catalogPage = null;
  } else {
    payload.catalogPage = null;
  }
  payload.confidence = v.confidence || null;
  payload.source = v.source.trim() || null;
  payload.observation = v.observation.trim() || null;
  // importSource / importBatch are READ-ONLY at the form level; never send them.

  return payload;
}

/** Build the default `ProductFormValues` for the create page. All
 *  catalog-import fields are empty so the editor can fill only what
 *  is needed. */
export function emptyProductFormValues(): ProductFormValues {
  return {
    documentId: null,
    name: "",
    slug: "",
    shortDescription: "",
    description: "",
    price: "",
    currency: "CLP",
    category: "",
    active: true,
    featured: false,
    externalId: "",
    productType: "",
    subcategory: "",
    usageEnvironment: "",
    observableColor: "",
    observableMaterial: "",
    catalogPage: "",
    confidence: "",
    source: "",
    observation: "",
    importSource: "",
    importBatchFileName: "",
    importBatchUploadedAt: "",
  };
}

/** Translate a Strapi `Product` (admin shape) into `ProductFormValues`.
 *  Used by the edit page to seed the form's initial state. Tolerant
 *  of null / undefined for every catalog-import field. */
export function productToFormValues(
  p: Partial<{
    documentId: string | null;
    name: string;
    slug: string;
    description: string;
    shortDescription?: string;
    price: number;
    currency: string;
    category?: { documentId: string } | null;
    active: boolean;
    featured: boolean;
    externalId?: string;
    productType?: string;
    subcategory?: string;
    usageEnvironment?: string;
    observableColor?: string;
    observableMaterial?: string;
    catalogPage?: number;
    confidence?: string;
    source?: string;
    observation?: string;
    importSource?: "manual" | "imported";
    importBatch?: { fileName?: string; uploadedAt?: string } | null;
  }>,
): ProductFormValues {
  return {
    ...emptyProductFormValues(),
    documentId: p.documentId ?? null,
    name: p.name ?? "",
    slug: p.slug ?? "",
    description: p.description ?? "",
    shortDescription: p.shortDescription ?? "",
    price: typeof p.price === "number" ? String(p.price) : "",
    currency: p.currency || "CLP",
    category: p.category?.documentId ?? "",
    active: Boolean(p.active),
    featured: Boolean(p.featured),
    externalId: p.externalId ?? "",
    productType: p.productType ?? "",
    subcategory: p.subcategory ?? "",
    usageEnvironment: p.usageEnvironment ?? "",
    observableColor: p.observableColor ?? "",
    observableMaterial: p.observableMaterial ?? "",
    catalogPage:
      typeof p.catalogPage === "number" && p.catalogPage > 0 ? String(p.catalogPage) : "",
    confidence: p.confidence ?? "",
    source: p.source ?? "",
    observation: p.observation ?? "",
    importSource: p.importSource ?? "",
    importBatchFileName: p.importBatch?.fileName ?? "",
    importBatchUploadedAt: p.importBatch?.uploadedAt ?? "",
  };
}

/** Catalog-import (S1) — the enum values for `productType` and
 *  `confidence`. Kept in sync with `apps/cms/src/api/product/.../schema.json`
 *  and `apps/web/src/lib/strapi.ts::PRODUCT_TYPE_VALUES`. The form
 *  uses local copies because importing the `PRODUCT_TYPE_VALUES`
 *  const from `@/lib/strapi` would pull the whole Strapi client into
 *  the client bundle; the form only needs the labels for the
 *  `<option>` list. */
export const PRODUCT_TYPE_OPTIONS = [
  "Silla",
  "Mesa",
  "Escritorio",
  "Banca",
  "Piso",
  "Cuna",
] as const;

export const CONFIDENCE_OPTIONS = [
  "alta",
  "media-variante-visual",
  "media-nombre-generico-pdf",
  "baja",
  "revision-manual",
] as const;
