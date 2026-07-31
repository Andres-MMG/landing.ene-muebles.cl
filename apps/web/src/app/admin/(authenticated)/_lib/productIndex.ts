export const PRODUCT_INDEX_PAGE_SIZE = 100;
export const PRODUCT_INDEX_MAX_ITEMS = 500;

export type StrapiPage<T> = {
  data: T[];
  meta?: { pagination?: { pageCount?: number } };
};

function normalizeStrapiPage<T>(value: unknown): StrapiPage<T> {
  if (!value || typeof value !== "object") return { data: [] };
  const page = value as { data?: unknown; meta?: StrapiPage<T>["meta"] };
  return {
    data: Array.isArray(page.data) ? (page.data as T[]) : [],
    meta: page.meta,
  };
}

export async function readStrapiProductPage<T>(response: {
  ok: boolean;
  json: () => Promise<unknown>;
}): Promise<StrapiPage<T>> {
  if (!response.ok) return { data: [] };
  try {
    return normalizeStrapiPage<T>(await response.json());
  } catch {
    return { data: [] };
  }
}

/**
 * Aggregate Strapi's capped REST pages into the bounded client-side product index.
 * The hard cap keeps the UI predictable even if the catalog grows beyond the
 * current operating target.
 */
export async function aggregateProductIndex<T>(
  fetchPage: (page: number) => Promise<unknown>,
  maxItems = PRODUCT_INDEX_MAX_ITEMS,
): Promise<T[]> {
  const products: T[] = [];

  for (let page = 1; products.length < maxItems; page += 1) {
    const result = normalizeStrapiPage<T>(await fetchPage(page));
    products.push(...result.data.slice(0, maxItems - products.length));

    const pageCount = result.meta?.pagination?.pageCount;
    if (
      !result.data.length ||
      result.data.length < PRODUCT_INDEX_PAGE_SIZE ||
      (pageCount && page >= pageCount)
    ) {
      break;
    }
  }

  return products;
}
