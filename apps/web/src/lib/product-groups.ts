import type { Product } from "@/lib/strapi";

export type ProductSubcategoryGroup = {
  id: string;
  name: string;
  products: Product[];
};

export type ProductSubcategorySummary = {
  id: string;
  name: string;
  count: number;
};

export type ProductSubcategoryCount = {
  subcategory?: string;
  count: number;
};

const OTHER_PRODUCTS_GROUP = "Otros productos";

const normalizeSubcategory = (subcategory?: string): string => subcategory?.trim() ?? "";

const groupId = (subcategory: string, index: number): string => {
  const slug = subcategory
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `subcategory-${slug || "other"}-${index + 1}`;
};

/**
 * Groups the currently visible product page by the optional Strapi
 * `subcategory` field. Products without that field stay visible together
 * under a clear fallback label instead of being hidden or discarded.
 */
export function groupProductsBySubcategory(products: Product[]): ProductSubcategoryGroup[] {
  const groups = new Map<string, { name: string; products: Product[] }>();

  for (const product of products) {
    const subcategory = normalizeSubcategory(product.subcategory);
    const key = subcategory.toLocaleLowerCase("es-CL") || "__other__";
    const group = groups.get(key);

    if (group) {
      group.products.push(product);
      continue;
    }

    groups.set(key, {
      name: subcategory || OTHER_PRODUCTS_GROUP,
      products: [product],
    });
  }

  return Array.from(groups.values()).map((group, index) => ({
    ...group,
    id: groupId(group.name, index),
  }));
}

export function summarizeSubcategories(
  products: Array<Pick<Product, "subcategory">>,
): ProductSubcategorySummary[] {
  const groups = new Map<string, { name: string; count: number }>();

  for (const product of products) {
    const subcategory = normalizeSubcategory(product.subcategory);
    const key = subcategory.toLocaleLowerCase("es-CL") || "__other__";
    const group = groups.get(key);

    if (group) {
      group.count += 1;
      continue;
    }

    groups.set(key, {
      name: subcategory || OTHER_PRODUCTS_GROUP,
      count: 1,
    });
  }

  return Array.from(groups.values()).map((group, index) => ({
    ...group,
    id: groupId(group.name, index),
  }));
}

export function buildSubcategorySummaries(
  counts: ProductSubcategoryCount[],
): ProductSubcategorySummary[] {
  return counts.map(({ subcategory, count }, index) => ({
    id: groupId(subcategory || OTHER_PRODUCTS_GROUP, index),
    name: subcategory || OTHER_PRODUCTS_GROUP,
    count,
  }));
}

export function hasSubcategoryData(groups: ProductSubcategoryGroup[]): boolean {
  return groups.some((group) => group.name !== OTHER_PRODUCTS_GROUP);
}
