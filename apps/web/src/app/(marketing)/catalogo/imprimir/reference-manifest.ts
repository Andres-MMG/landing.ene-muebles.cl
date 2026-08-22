import type { CatalogSnapshot, Product } from "@/lib/strapi";

export const PRODUCTS_PER_REFERENCE_PAGE = 8;

export type ReferenceTemplate = "a" | "b";

export type ReferenceSlot = {
  slug: string;
  sourcePage: number;
  template: ReferenceTemplate;
  slot: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  imageIndex: number;
};

export type ReferenceAsset = {
  path: string;
  sha256: string;
  purpose: "source-pdf" | "logo" | "cover-mosaic";
};

export type ReferenceManifest = {
  version: string;
  visualEvidence: {
    status: "provided";
    cover: string;
    index: string;
    categoryPage: string;
  };
  source: {
    status: "pending" | "approved";
    assets: ReferenceAsset[];
  };
  slots: ReferenceSlot[];
};

export type ReferencePlacementErrorCode =
  | "reference-pending"
  | "snapshot-truncated"
  | "duplicate-product"
  | "invalid-slot"
  | "slot-out-of-range"
  | "duplicate-slot"
  | "duplicate-product-mapping"
  | "stale-slot"
  | "unmapped-product"
  | "catalog-page-mismatch"
  | "incomplete-page";

export type ReferencePlacementError = {
  code: ReferencePlacementErrorCode;
  message: string;
  slug?: string;
  sourcePage?: number;
};

export type ResolvedReferenceProduct = {
  slot: ReferenceSlot;
  product: Product;
};

export type ResolvedPrintPage = {
  sourcePage: number;
  template: ReferenceTemplate;
  products: ResolvedReferenceProduct[];
};

export type ReferencePlacementResult =
  | { ok: true; pages: ResolvedPrintPage[] }
  | { ok: false; errors: ReferencePlacementError[] };

/**
 * The supplied visual evidence defines the document grammar. Immutable source
 * files, an approved served logo, and exact measurements are still absent, so
 * assets remain pending. The print document must not require this legacy
 * slug-to-slot helper to render current CMS products.
 */
export const REFERENCE_MANIFEST: ReferenceManifest = {
  version: "visible-reference-evidence-v1",
  visualEvidence: {
    status: "provided",
    cover: "A4 landscape, approximately 56 percent charcoal and 44 percent warm taupe; no mosaic.",
    index:
      "One two-column index with alternating ochre and green count bullets and a charcoal contact card.",
    categoryPage:
      "Black header with ochre left accent and a fixed four-column, two-row maximum product grid.",
  },
  source: {
    status: "pending",
    assets: [],
  },
  slots: [],
};

type CatalogPrintSnapshot = Pick<CatalogSnapshot, "products" | "truncated">;

const isTemplate = (value: unknown): value is ReferenceTemplate => value === "a" || value === "b";

const isPositiveInteger = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value > 0;

const errorOrder = (left: ReferencePlacementError, right: ReferencePlacementError) =>
  `${left.sourcePage ?? 0}:${left.slug ?? ""}:${left.code}`.localeCompare(
    `${right.sourcePage ?? 0}:${right.slug ?? ""}:${right.code}`,
  );

/**
 * Validates a supplied reference manifest against one bounded CMS snapshot.
 * This helper only resolves existing CMS products; it never fills missing
 * slots or facts. A final category page may contain one to eight mapped
 * products; the print template preserves the remaining card positions blank.
 */
export function resolveReferencePlacement(
  snapshot: CatalogPrintSnapshot,
  manifest: ReferenceManifest = REFERENCE_MANIFEST,
): ReferencePlacementResult {
  const errors: ReferencePlacementError[] = [];
  const productsBySlug = new Map<string, Product>();
  const mappedSlugs = new Set<string>();
  const usedPageSlots = new Set<string>();
  const pageSlots = new Map<number, ReferenceSlot[]>();

  if (manifest.source.status !== "approved") {
    errors.push({
      code: "reference-pending",
      message: "Reference assets and CMS placement mapping have not been approved.",
    });
  }

  if (snapshot.truncated) {
    errors.push({
      code: "snapshot-truncated",
      message:
        "The bounded CMS snapshot is truncated and cannot claim complete reference coverage.",
    });
  }

  for (const product of snapshot.products) {
    if (productsBySlug.has(product.slug)) {
      errors.push({
        code: "duplicate-product",
        slug: product.slug,
        message: `CMS snapshot contains duplicate product slug "${product.slug}".`,
      });
      continue;
    }
    productsBySlug.set(product.slug, product);
  }

  for (const entry of manifest.slots) {
    const sourcePage = entry.sourcePage;
    const hasValidPage = isPositiveInteger(sourcePage);
    const hasValidSlot = isPositiveInteger(entry.slot) && entry.slot <= PRODUCTS_PER_REFERENCE_PAGE;
    const hasValidImageIndex = Number.isInteger(entry.imageIndex) && entry.imageIndex >= 0;
    const hasValidEntry =
      hasValidPage && hasValidSlot && hasValidImageIndex && isTemplate(entry.template);

    if (!hasValidEntry) {
      errors.push({
        code: hasValidSlot ? "invalid-slot" : "slot-out-of-range",
        slug: entry.slug,
        sourcePage,
        message: `Reference slot for "${entry.slug}" has invalid page, template, slot, or image index data.`,
      });
      continue;
    }

    const pageSlotKey = `${sourcePage}:${entry.slot}`;
    if (usedPageSlots.has(pageSlotKey)) {
      errors.push({
        code: "duplicate-slot",
        slug: entry.slug,
        sourcePage,
        message: `Reference page ${sourcePage} maps more than one product to slot ${entry.slot}.`,
      });
    }
    usedPageSlots.add(pageSlotKey);

    if (mappedSlugs.has(entry.slug)) {
      errors.push({
        code: "duplicate-product-mapping",
        slug: entry.slug,
        sourcePage,
        message: `Product "${entry.slug}" appears more than once in the reference mapping.`,
      });
    }
    mappedSlugs.add(entry.slug);

    const product = productsBySlug.get(entry.slug);
    if (!product) {
      errors.push({
        code: "stale-slot",
        slug: entry.slug,
        sourcePage,
        message: `Reference mapping points to missing CMS product "${entry.slug}".`,
      });
      continue;
    }

    if (product.catalogPage !== undefined && product.catalogPage !== sourcePage) {
      errors.push({
        code: "catalog-page-mismatch",
        slug: entry.slug,
        sourcePage,
        message: `CMS catalogPage for "${entry.slug}" does not match the approved reference page.`,
      });
    }

    const slots = pageSlots.get(sourcePage) ?? [];
    slots.push(entry);
    pageSlots.set(sourcePage, slots);
  }

  for (const slug of productsBySlug.keys()) {
    if (!mappedSlugs.has(slug)) {
      errors.push({
        code: "unmapped-product",
        slug,
        message: `CMS product "${slug}" has no approved reference placement.`,
      });
    }
  }

  for (const [sourcePage, slots] of pageSlots) {
    if (slots.length < 1 || slots.length > PRODUCTS_PER_REFERENCE_PAGE) {
      errors.push({
        code: "incomplete-page",
        sourcePage,
        message: `Reference page ${sourcePage} must contain between 1 and ${PRODUCTS_PER_REFERENCE_PAGE} mapped products.`,
      });
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors: errors.sort(errorOrder) };
  }

  const pages = [...pageSlots.entries()]
    .sort(([left], [right]) => left - right)
    .map(([sourcePage, slots]) => {
      const orderedSlots = [...slots].sort((left, right) => left.slot - right.slot);
      return {
        sourcePage,
        template: orderedSlots[0]!.template,
        products: orderedSlots.map((slot) => ({
          slot,
          product: productsBySlug.get(slot.slug)!,
        })),
      };
    });

  return { ok: true, pages };
}
