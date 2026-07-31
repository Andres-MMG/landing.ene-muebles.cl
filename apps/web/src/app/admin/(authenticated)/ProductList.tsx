"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { strapiMediaUrl } from "@/lib/strapi-media";
import {
  DEFAULT_PRODUCT_LIST_VIEW,
  filterAndSortProductIndex,
  parseProductListView,
  serializeProductListView,
  type ProductListSort,
  type ProductListSource,
  type ProductListStatus,
  type ProductListViewState,
} from "./_lib/productListState";

type Product = {
  id: number;
  documentId: string;
  name: string;
  slug: string;
  price: number;
  currency: string;
  publishedAt: string | null;
  externalId?: string;
  subcategory?: string;
  category?: { documentId?: string; name: string; slug: string } | null;
  images?: { id: number; url: string; formats?: { thumbnail?: { url: string } }; name: string }[];
  importSource?: "manual" | "imported";
  importBatch?: { documentId?: string; fileName?: string; uploadedAt?: string } | null;
};

type CategoryOption = { documentId: string; name: string; active: boolean };
type ImportBatchBanner =
  | { documentId?: string; fileName?: string; uploadedAt?: string }
  | null
  | undefined;

const STORAGE_KEY = "ene-admin-product-list-view";
const SCROLL_STORAGE_KEY = "ene-admin-product-list-scroll";
const PAGE_SIZE = 40;
const BATCH_DATE = new Intl.DateTimeFormat("es-CL", { dateStyle: "medium", timeStyle: "short" });

function coverUrl(product: Product): string | null {
  const image = product.images?.[0];
  return image ? strapiMediaUrl(image.formats?.thumbnail?.url ?? image.url) : null;
}

function loadStoredView(): ProductListViewState | null {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    if (!value) return null;
    return { ...DEFAULT_PRODUCT_LIST_VIEW, ...JSON.parse(value) };
  } catch {
    return null;
  }
}

export function ProductList({
  products,
  categories,
  importBatch,
}: {
  products: Product[];
  categories: CategoryOption[];
  importBatch?: ImportBatchBanner;
}) {
  const pathname = usePathname();
  const sentinelRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [view, setView] = useState<ProductListViewState>(DEFAULT_PRODUCT_LIST_VIEW);
  const [hydrated, setHydrated] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const updateUrl = useCallback(
    (next: ProductListViewState) => {
      const query = serializeProductListView(next);
      window.history.replaceState(
        window.history.state,
        "",
        query ? `${pathname}?${query}` : pathname,
      );
      window.dispatchEvent(new Event("admin-product-list-state"));
    },
    [pathname],
  );

  useEffect(() => {
    const urlView = parseProductListView(new URLSearchParams(window.location.search));
    const hasUrlState = window.location.search.length > 0;
    const initial = hasUrlState ? urlView : (loadStoredView() ?? urlView);
    const frame = requestAnimationFrame(() => {
      setView(initial);
      setHydrated(true);
    });
    if (!hasUrlState && serializeProductListView(initial)) updateUrl(initial);
    const savedScroll = Number(window.sessionStorage.getItem(SCROLL_STORAGE_KEY));
    if (Number.isFinite(savedScroll) && savedScroll > 0)
      requestAnimationFrame(() => window.scrollTo({ top: savedScroll, behavior: "auto" }));
    return () => cancelAnimationFrame(frame);
  }, [updateUrl]);

  useEffect(() => {
    const restoreFromHistory = () => {
      setView(parseProductListView(new URLSearchParams(window.location.search)));
    };
    window.addEventListener("popstate", restoreFromHistory);
    return () => window.removeEventListener("popstate", restoreFromHistory);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(view));
  }, [hydrated, view]);

  const persistScroll = useCallback(() => {
    window.sessionStorage.setItem(SCROLL_STORAGE_KEY, String(Math.round(window.scrollY)));
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") persistScroll();
    };
    window.addEventListener("pagehide", persistScroll);
    window.addEventListener("beforeunload", persistScroll);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      persistScroll();
      window.removeEventListener("pagehide", persistScroll);
      window.removeEventListener("beforeunload", persistScroll);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [hydrated, persistScroll]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (drawerOpen && !dialog.open) dialog.showModal();
    if (!drawerOpen && dialog.open) dialog.close();
  }, [drawerOpen]);

  const filtered = useMemo(
    () =>
      filterAndSortProductIndex(
        products.map((product) => ({ ...product, hasImage: Boolean(product.images?.length) })),
        view,
      ),
    [products, view],
  );
  const visibleProducts = filtered.slice(0, visibleCount);
  const listQuery = serializeProductListView(view);
  const returnTo = listQuery ? `${pathname}?${listQuery}` : pathname;

  useEffect(() => {
    const frame = requestAnimationFrame(() => setVisibleCount(PAGE_SIZE));
    return () => cancelAnimationFrame(frame);
  }, [
    view.query,
    view.categoryId,
    view.status,
    view.source,
    view.image,
    view.sort,
    view.direction,
    view.importBatch,
  ]);
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || visibleCount >= filtered.length) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting)
          setVisibleCount((count) => Math.min(count + PAGE_SIZE, filtered.length));
      },
      { rootMargin: "500px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [filtered.length, visibleCount]);

  const apply = (patch: Partial<ProductListViewState>) =>
    setView((current) => {
      const next = { ...current, ...patch };
      window.sessionStorage.removeItem(SCROLL_STORAGE_KEY);
      updateUrl(next);
      return next;
    });
  const clear = () => apply({ ...DEFAULT_PRODUCT_LIST_VIEW });
  const activeFilters = [
    view.categoryId &&
      `Categoría: ${categories.find((category) => category.documentId === view.categoryId)?.name ?? "seleccionada"}`,
    view.status !== "all" && `Estado: ${view.status === "live" ? "Publicados" : "Borradores"}`,
    view.source !== "all" && `Origen: ${view.source === "imported" ? "Excel" : "Manual"}`,
    view.image === "missing" && "Sin imagen",
    view.importBatch && "Importación",
  ].filter(Boolean) as string[];

  const controls = (inDrawer = false) => (
    <div className="space-y-5">
      <label className="block">
        <span className="t-label text-ink-mute">Categoría</span>
        <select
          value={view.categoryId}
          onChange={(event) => apply({ categoryId: event.target.value })}
          className="mt-2 w-full border border-ink-line bg-paper-pure px-3 py-2 text-sm"
        >
          <option value="">Todas</option>
          {categories.map((category) => (
            <option key={category.documentId} value={category.documentId}>
              {category.name}
              {category.active ? "" : " (inactiva)"}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="t-label text-ink-mute">Estado</span>
        <select
          value={view.status}
          onChange={(event) => apply({ status: event.target.value as ProductListStatus })}
          className="mt-2 w-full border border-ink-line bg-paper-pure px-3 py-2 text-sm"
        >
          <option value="all">Todos</option>
          <option value="live">Publicados</option>
          <option value="draft">Borradores</option>
        </select>
      </label>
      <label className="block">
        <span className="t-label text-ink-mute">Origen</span>
        <select
          value={view.source}
          onChange={(event) => apply({ source: event.target.value as ProductListSource })}
          className="mt-2 w-full border border-ink-line bg-paper-pure px-3 py-2 text-sm"
        >
          <option value="all">Todos</option>
          <option value="imported">Excel</option>
          <option value="manual">Manual</option>
        </select>
      </label>
      <label className="flex min-h-11 items-center gap-3 border-t border-ink-line pt-5 text-sm">
        <input
          type="checkbox"
          checked={view.image === "missing"}
          onChange={(event) => apply({ image: event.target.checked ? "missing" : "all" })}
          className="h-4 w-4 accent-ink"
        />{" "}
        Sin imagen
      </label>
      {inDrawer ? (
        <div className="sticky bottom-0 -mx-6 flex gap-3 border-t border-ink-line bg-paper px-6 py-4">
          <button
            type="button"
            onClick={clear}
            className="min-h-11 flex-1 border border-ink px-4 text-sm font-medium"
          >
            Limpiar
          </button>
          <button
            type="button"
            onClick={() => setDrawerOpen(false)}
            className="min-h-11 flex-1 bg-ink px-4 text-sm font-medium text-paper"
          >
            Aplicar filtros
          </button>
        </div>
      ) : null}
    </div>
  );

  const toggleSort = (sort: ProductListSort) =>
    apply({ sort, direction: view.sort === sort && view.direction === "asc" ? "desc" : "asc" });
  const sortButton = (sort: ProductListSort, label: string) => (
    <button
      type="button"
      onClick={() => toggleSort(sort)}
      className="inline-flex items-center gap-1 text-left hover:text-taupe-deep"
      aria-label={`Ordenar por ${label}${view.sort === sort ? `, ${view.direction === "asc" ? "ascendente" : "descendente"}` : ""}`}
    >
      {label}
      {view.sort === sort ? <span aria-hidden>{view.direction === "asc" ? "↑" : "↓"}</span> : null}
    </button>
  );

  if (products.length === 0)
    return (
      <div className="mt-10 border border-ink-line p-12 text-center">
        <p className="t-label text-ink-mute">Sin productos</p>
        <p className="mt-3 text-ink-mute">Aún no hay productos en el catálogo.</p>
      </div>
    );

  return (
    <section className="mt-10" aria-label="Índice local de productos">
      {importBatch?.fileName && view.importBatch ? (
        <div
          data-testid="import-batch-filter-banner"
          aria-live="polite"
          className="mb-6 flex flex-wrap items-center justify-between gap-4 border border-taupe/40 bg-cream-soft/40 px-5 py-3"
        >
          <p
            data-testid="import-batch-filter-label"
            className="t-mono text-[10px] uppercase tracking-[0.18em] text-ink"
          >
            Filtrando por importación: <span className="font-semibold">{importBatch.fileName}</span>
            {importBatch.uploadedAt
              ? ` · ${BATCH_DATE.format(new Date(importBatch.uploadedAt))}`
              : ""}
          </p>
          <button
            type="button"
            onClick={() => apply({ importBatch: "" })}
            className="t-label text-taupe-deep underline underline-offset-4"
          >
            Quitar filtro
          </button>
        </div>
      ) : null}
      <div className="grid gap-6 lg:grid-cols-[13rem_minmax(0,1fr)] lg:items-start">
        <aside
          className="hidden border-y border-ink-line py-5 lg:block"
          aria-label="Filtros de productos"
        >
          <p className="t-label mb-5 text-ink">Filtros</p>
          {controls()}
        </aside>
        <div>
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-ink-line pb-5">
            <label className="min-w-[min(100%,22rem)] flex-1">
              <span className="t-label text-ink-mute">Buscar en el índice</span>
              <input
                type="search"
                value={view.query}
                onChange={(event) => apply({ query: event.target.value })}
                placeholder="Nombre, código, categoría o subcategoría"
                className="mt-2 w-full border border-ink-line bg-paper-pure px-3 py-2 text-sm placeholder:text-ink-soft"
              />
            </label>
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="min-h-11 border border-ink px-4 text-sm font-medium lg:hidden"
            >
              Filtros{activeFilters.length ? ` (${activeFilters.length})` : ""}
            </button>
          </div>
          <div
            className="mt-4 flex flex-wrap items-center justify-between gap-3"
            aria-live="polite"
          >
            <p className="t-mono text-[11px] uppercase tracking-[0.16em] text-ink-mute">
              {filtered.length} de {products.length} productos
            </p>
            {activeFilters.length ? (
              <div className="flex flex-wrap items-center gap-2">
                {activeFilters.map((filter) => (
                  <span
                    key={filter}
                    className="border border-taupe/60 px-2 py-1 text-xs text-taupe-deep"
                  >
                    {filter}
                  </span>
                ))}
                <button
                  type="button"
                  onClick={clear}
                  className="min-h-11 px-2 text-sm underline underline-offset-4"
                >
                  Limpiar todo
                </button>
              </div>
            ) : null}
          </div>
          <div className="mt-5 border-t border-ink">
            <div className="grid grid-cols-[4rem_minmax(0,1fr)] gap-4 border-b border-ink-line py-3 sm:grid-cols-[5rem_minmax(0,1fr)_8rem_7rem] sm:gap-5">
              <span className="t-label text-ink-mute">Imagen</span>
              <span className="t-label">{sortButton("name", "Producto")}</span>
              <span className="t-label hidden sm:block">{sortButton("externalId", "Código")}</span>
              <span className="t-label hidden sm:block">{sortButton("category", "Categoría")}</span>
            </div>
            {visibleProducts.length ? (
              <ul role="list" className="divide-y divide-ink-line">
                {visibleProducts.map((product) => (
                  <ProductRow
                    key={product.documentId}
                    product={product}
                    returnTo={returnTo}
                    onOpen={persistScroll}
                  />
                ))}
              </ul>
            ) : (
              <div className="py-12 text-center">
                <p className="t-label text-ink-mute">Sin resultados</p>
                <p className="mt-3 text-ink-mute">Probá quitar uno o más filtros.</p>
              </div>
            )}
            <div ref={sentinelRef} aria-hidden className="h-px" />
            {visibleProducts.length < filtered.length ? (
              <p className="py-5 text-center text-sm text-ink-mute">Cargando más productos…</p>
            ) : null}
          </div>
        </div>
      </div>
      <dialog
        ref={dialogRef}
        onCancel={() => setDrawerOpen(false)}
        aria-labelledby="product-filters-title"
        className="m-0 ml-auto h-full w-[min(94vw,28rem)] max-w-none border-0 bg-paper p-6 text-ink backdrop:bg-ink/35"
      >
        <div className="flex items-center justify-between border-b border-ink-line pb-5">
          <h2 id="product-filters-title" className="t-h2 text-xl">
            Filtros
          </h2>
          <button
            type="button"
            onClick={() => setDrawerOpen(false)}
            className="min-h-11 min-w-11 text-2xl"
            aria-label="Cerrar filtros"
          >
            ×
          </button>
        </div>
        <div className="py-6">{controls(true)}</div>
      </dialog>
    </section>
  );
}

function ProductRow({
  product,
  returnTo,
  onOpen,
}: {
  product: Product;
  returnTo: string;
  onOpen: () => void;
}) {
  const cover = coverUrl(product);
  const isLive = Boolean(product.publishedAt);
  return (
    <li>
      <Link
        href={
          `/admin/productos/${product.documentId}?from=${encodeURIComponent(returnTo)}` as never
        }
        onClick={onOpen}
        className="group grid grid-cols-[4rem_minmax(0,1fr)] items-center gap-4 py-4 transition-colors hover:bg-cream-soft/40 sm:grid-cols-[5rem_minmax(0,1fr)_8rem_7rem] sm:gap-5"
      >
        <div className="relative aspect-square overflow-hidden bg-cream-soft">
          {cover ? (
            <Image
              src={cover}
              alt=""
              fill
              loading="lazy"
              sizes="(min-width: 640px) 80px, 64px"
              className="object-cover"
            />
          ) : (
            <span className="flex h-full items-center justify-center t-mono text-[9px] text-ink-soft">
              N/A
            </span>
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate font-medium text-ink group-hover:text-taupe-deep">
            {product.name}
          </p>
          <p className="mt-1 truncate text-xs text-ink-mute">
            {product.subcategory ?? product.slug}
          </p>
          <div className="mt-2 flex flex-wrap gap-2 sm:hidden">
            <span className="text-xs text-ink-mute">{product.externalId ?? "Sin código"}</span>
            <span className="text-xs text-ink-mute">
              {product.category?.name ?? "Sin categoría"}
            </span>
          </div>
        </div>
        <div className="hidden sm:block">
          <p className="t-mono text-xs text-ink">{product.externalId ?? "—"}</p>
          <p className="mt-1 text-xs text-ink-mute">{isLive ? "Publicado" : "Borrador"}</p>
        </div>
        <div className="hidden sm:block">
          <p className="text-sm text-ink">{product.category?.name ?? "Sin categoría"}</p>
          <p className="mt-1 text-xs text-ink-mute">
            {product.importSource === "imported" ? "Excel" : "Manual"}
          </p>
        </div>
      </Link>
    </li>
  );
}
