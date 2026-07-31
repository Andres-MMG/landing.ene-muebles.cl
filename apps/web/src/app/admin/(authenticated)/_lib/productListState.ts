export type ProductListStatus = "all" | "live" | "draft";
export type ProductListSource = "all" | "imported" | "manual";
export type ProductListImage = "all" | "missing";
export type ProductListSort = "externalId" | "name" | "category" | "status";
export type SortDirection = "asc" | "desc";

export interface ProductListIndexItem {
  documentId: string;
  name: string;
  externalId?: string;
  subcategory?: string;
  publishedAt: string | null;
  category?: { documentId?: string; name: string } | null;
  importSource?: "manual" | "imported";
  importBatch?: { documentId?: string } | null;
  hasImage: boolean;
}

export interface ProductListViewState {
  query: string;
  categoryId: string;
  status: ProductListStatus;
  source: ProductListSource;
  image: ProductListImage;
  sort: ProductListSort;
  direction: SortDirection;
  importBatch: string;
}

export const DEFAULT_PRODUCT_LIST_VIEW: ProductListViewState = {
  query: "",
  categoryId: "",
  status: "all",
  source: "all",
  image: "all",
  sort: "externalId",
  direction: "asc",
  importBatch: "",
};

export function normalizeProductSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es-CL")
    .trim();
}

export function filterAndSortProductIndex<T extends ProductListIndexItem>(
  products: T[],
  state: ProductListViewState,
): T[] {
  const terms = normalizeProductSearch(state.query).split(/\s+/).filter(Boolean);
  const direction = state.direction === "asc" ? 1 : -1;
  const collator = new Intl.Collator("es-CL", { numeric: true, sensitivity: "base" });

  return products
    .filter((product) => {
      const searchable = normalizeProductSearch(
        [product.name, product.externalId, product.category?.name, product.subcategory]
          .filter(Boolean)
          .join(" "),
      );
      if (terms.length && !terms.every((term) => searchable.includes(term))) return false;
      if (state.categoryId && product.category?.documentId !== state.categoryId) return false;
      if (state.status === "live" && !product.publishedAt) return false;
      if (state.status === "draft" && product.publishedAt) return false;
      const source = product.importSource ?? "manual";
      if (state.source !== "all" && source !== state.source) return false;
      if (state.image === "missing" && product.hasImage) return false;
      if (state.importBatch && product.importBatch?.documentId !== state.importBatch) return false;
      return true;
    })
    .sort((a, b) => {
      const values: Record<ProductListSort, [string, string]> = {
        externalId: [a.externalId ?? "", b.externalId ?? ""],
        name: [a.name, b.name],
        category: [a.category?.name ?? "", b.category?.name ?? ""],
        status: [a.publishedAt ? "0" : "1", b.publishedAt ? "0" : "1"],
      };
      const primary = collator.compare(...values[state.sort]);
      if (primary) return primary * direction;
      const byName = collator.compare(a.name, b.name);
      if (byName) return byName;
      return collator.compare(a.category?.name ?? "", b.category?.name ?? "");
    });
}

export function parseProductListView(params: URLSearchParams): ProductListViewState {
  const value = (key: string) => params.get(key) ?? "";
  const status = value("status");
  const source = value("source");
  const image = value("image");
  const sort = value("sort");
  const direction = value("dir");
  return {
    query: value("q"),
    categoryId: value("category"),
    status: status === "live" || status === "draft" ? status : "all",
    source: source === "imported" || source === "manual" ? source : "all",
    image: image === "missing" ? "missing" : "all",
    sort: ["externalId", "name", "category", "status"].includes(sort)
      ? (sort as ProductListSort)
      : "externalId",
    direction: direction === "desc" ? "desc" : "asc",
    importBatch: value("importBatch"),
  };
}

export function serializeProductListView(state: ProductListViewState): string {
  const params = new URLSearchParams();
  if (state.query) params.set("q", state.query);
  if (state.categoryId) params.set("category", state.categoryId);
  if (state.status !== "all") params.set("status", state.status);
  if (state.source !== "all") params.set("source", state.source);
  if (state.image !== "all") params.set("image", state.image);
  if (state.sort !== "externalId") params.set("sort", state.sort);
  if (state.direction !== "asc") params.set("dir", state.direction);
  if (state.importBatch) params.set("importBatch", state.importBatch);
  return params.toString();
}

export function productListReturnTarget(from: string | null): string {
  return from?.startsWith("/admin/productos") && !from.startsWith("//") ? from : "/admin/productos";
}
