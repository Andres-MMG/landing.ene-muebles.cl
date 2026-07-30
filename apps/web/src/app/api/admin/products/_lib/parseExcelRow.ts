/**
 * Catalog-import (S1) — pure row-to-product mapper.
 *
 * Lives under `app/api/admin/products/_lib/` so the future S2 batch
 * route and the future S3 admin preview UI can share the exact same
 * logic. The underscore-prefixed folder is a Next.js "private route
 * folder" — the file is not exposed as a public route.
 *
 * Pure function. No I/O, no Strapi calls. Same input -> same output.
 */

import type { Product } from '@/lib/strapi';

/** Raw row as SheetJS emits it. Keys may be Spanish or English headers. */
export type ExcelRow = Record<string, unknown>;

export type ConfidenceResult =
  | 'alta'
  | 'media-variante-visual'
  | 'media-nombre-generico-pdf'
  | 'revision-manual';

/** Subset of `Product` that the importer may write. */
export type MappedProductValues = Pick<
  Product,
  | 'name'
  | 'externalId'
  | 'slug'
  | 'description'
  | 'shortDescription'
  | 'price'
  | 'productType'
  | 'subcategory'
  | 'usageEnvironment'
  | 'observableColor'
  | 'observableMaterial'
  | 'catalogPage'
  | 'confidence'
  | 'source'
  | 'observation'
>;

export type MapExcelRowResult = {
  /** Missing attributes mean the Excel cell was empty / not parseable. */
  values: Partial<MappedProductValues>;
  warnings: string[];
};

/** Fixed Certeza -> confidence lookup. Anything else -> revision-manual. */
export const CONFIDENCE_MAP = {
  alta: 'alta',
  'media - variante visual': 'media-variante-visual',
  'media - nombre genérico en PDF': 'media-nombre-generico-pdf',
} as const satisfies Record<string, ConfidenceResult>;

export const ALLOWED_PRODUCT_TYPES = [
  'Silla',
  'Mesa',
  'Escritorio',
  'Banca',
  'Piso',
  'Cuna',
] as const;

const SLUG_INVALID_RE = /[^a-z0-9]+/g;
const SLUG_TRIM_RE = /^-+|-+$/g;

/** Lowercases, strips accents, collapses non-alphanumerics to `-`. */
export function slugify(input: string | null | undefined): string {
  if (typeof input !== 'string') return '';
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(SLUG_INVALID_RE, '-')
    .replace(SLUG_TRIM_RE, '');
}

export function deriveCatalogSlug(
  name: string | null | undefined,
  externalId: string | null | undefined
): string {
  const baseSlug = slugify(name);
  const idPart = typeof externalId === 'string' ? slugify(externalId) : '';
  if (!baseSlug || !idPart) return '';
  return `${baseSlug}-${idPart}`;
}

/**
 * Translate a raw `Certeza` cell to a `confidence` value. Empty or
 * unmapped values fall through to `revision-manual` and signal
 * `isKnown = false` so the caller can attach a warning.
 */
export function confidenceFromCerteza(raw: unknown): {
  value: ConfidenceResult;
  isKnown: boolean;
} {
  if (typeof raw !== 'string') {
    return { value: 'revision-manual', isKnown: false };
  }
  const normalized = raw.trim();
  if (!normalized) return { value: 'revision-manual', isKnown: false };
  const mapped = (CONFIDENCE_MAP as Record<string, ConfidenceResult>)[
    normalized
  ];
  if (mapped) return { value: mapped, isKnown: true };
  return { value: 'revision-manual', isKnown: false };
}

function asTrimmedString(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const trimmed = raw.trim();
  return trimmed === '' ? undefined : trimmed;
}

function asPositiveInteger(raw: unknown): number | undefined {
  if (raw === null || raw === undefined || raw === '') return undefined;
  const n =
    typeof raw === 'number'
      ? raw
      : typeof raw === 'string'
      ? Number(raw.trim())
      : NaN;
  return Number.isFinite(n) && n >= 1 ? Math.trunc(n) : undefined;
}

function normalizeProductType(raw: unknown): string {
  const trimmed = asTrimmedString(raw);
  if (!trimmed) return '';
  return (ALLOWED_PRODUCT_TYPES as readonly string[]).includes(trimmed)
    ? trimmed
    : '';
}

export function mapExcelRowToProduct(row: ExcelRow): MapExcelRowResult {
  const warnings: string[] = [];
  const values: Partial<MappedProductValues> = {};

  const name = asTrimmedString(row['Producto'] ?? row['name']);
  if (name) values.name = name;

  const externalId = asTrimmedString(row['ID'] ?? row['externalId']);
  if (externalId) values.externalId = externalId;

  const slug = deriveCatalogSlug(name, externalId);
  if (slug) values.slug = slug;

  const description = asTrimmedString(
    row['Descripción'] ?? row['description']
  );
  if (description) values.description = description;

  const shortDescription = asTrimmedString(
    row['Descripción corta'] ?? row['shortDescription']
  );
  if (shortDescription) values.shortDescription = shortDescription;

  const priceHeaderPresent = 'Precio' in row || 'price' in row;
  const priceCell = row['Precio'] ?? row['price'];
  const priceMissing =
    priceCell === null ||
    priceCell === undefined ||
    priceCell === '' ||
    (typeof priceCell === 'string' && priceCell.trim() === '');
  if (priceMissing) {
    values.price = 0;
    if (priceHeaderPresent) warnings.push('precio faltante');
  } else {
    const numeric =
      typeof priceCell === 'number'
        ? priceCell
        : Number(String(priceCell).trim());
    values.price = Number.isFinite(numeric) && numeric >= 0 ? numeric : 0;
  }

  const productType = normalizeProductType(
    row['Qué es'] ?? row['Tipo'] ?? row['productType']
  );
  if (productType) values.productType = productType;

  const subcategory = asTrimmedString(
    row['Subcategoría'] ?? row['subcategory']
  );
  if (subcategory) values.subcategory = subcategory;

  const usageEnvironment = asTrimmedString(
    row['Uso / ambiente'] ?? row['Ambiente de uso'] ?? row['usageEnvironment']
  );
  if (usageEnvironment) values.usageEnvironment = usageEnvironment;

  const observableColor = asTrimmedString(
    row['Color observable'] ?? row['Color'] ?? row['observableColor']
  );
  if (observableColor) values.observableColor = observableColor;

  const observableMaterial = asTrimmedString(
    row['Material / acabado observable'] ??
      row['Material'] ??
      row['observableMaterial']
  );
  if (observableMaterial) values.observableMaterial = observableMaterial;

  const catalogPage = asPositiveInteger(
    row['Página PDF'] ?? row['Página'] ?? row['catalogPage']
  );
  if (typeof catalogPage === 'number') values.catalogPage = catalogPage;

  const { value: confidence, isKnown } = confidenceFromCerteza(
    row['Certeza'] ?? row['confidence']
  );
  values.confidence = confidence;
  if (!isKnown) warnings.push('certeza faltante o desconocida');

  const source = asTrimmedString(row['Fuente'] ?? row['source']);
  if (source) values.source = source;

  const observation = asTrimmedString(
    row['Observación'] ?? row['observation']
  );
  if (observation) values.observation = observation;

  return { values, warnings };
}
