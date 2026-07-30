'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { strapiMediaUrl } from '@/lib/strapi-media';

type Product = {
  id: number;
  documentId: string;
  name: string;
  slug: string;
  price: number;
  currency: string;
  publishedAt: string | null;
  updatedAt?: string;
  category?: { documentId?: string; name: string; slug: string } | null;
  images?: {
    id: number;
    documentId: string;
    url: string;
    formats?: { thumbnail?: { url: string } };
    name: string;
  }[];
  /** Catalog-import (S4) — provenance metadata surfaced as a column. */
  importSource?: 'manual' | 'imported';
  importBatch?: {
    documentId?: string;
    fileName?: string;
    uploadedAt?: string;
  } | null;
};

type CategoryOption = {
  documentId: string;
  name: string;
  active: boolean;
};

type StatusFilter = 'all' | 'live' | 'draft';

/** Optional importBatch context used by the dashboard banner.
 *  `documentId` is included for completeness; the banner primarily
 *  surfaces `fileName` + a localized `uploadedAt` so the admin knows
 *  why the list is narrowed. */
type ImportBatchBanner = {
  documentId?: string;
  fileName?: string;
  uploadedAt?: string;
} | null | undefined;

const BATCH_DATE = new Intl.DateTimeFormat('es-CL', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

const STRAPI_BASE = (process.env.NEXT_PUBLIC_STRAPI_URL ?? 'http://localhost:4781').replace(/\/+$/, '');

function coverUrl(p: Product): string | null {
  // Use the first image's thumbnail (smaller download) when available.
  const first = p.images?.[0];
  if (!first) return null;
  const candidate = first.formats?.thumbnail?.url ?? first.url;
  return strapiMediaUrl(candidate);
}

const priceLabel = (p: Product) =>
  new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: p.currency || 'CLP',
    maximumFractionDigits: 0,
  }).format(p.price);

/** Format `importBatch.uploadedAt` (ISO) into a short `YYYY-MM-DD`
 *  stamp. Returns `null` when the timestamp is missing or unparseable
 *  so callers can fall back to a placeholder. */
function formatBatchStamp(iso?: string): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

/**
 * Table-style list of products for the admin. We use a table
 * (rather than a card grid) so a catalogue of 20+ rows stays
 * scannable; the visual system stays consistent with the public
 * site (mono labels, ink borders, taupe accents).
 *
 * Search + filters (search by name, category, status) run client-side
 * because the dashboard fetches at most 50 products.
 */
export function ProductList({
  products,
  categories,
  importBatch,
}: {
  products: Product[];
  categories: CategoryOption[];
  /** Catalog-import (E follow-up) — when present, a banner is shown
   *  above the table explaining the active `?importBatch=…` filter
   *  and offering a link to clear it. Strictly optional; absent means
   *  the unfiltered dashboard path. */
  importBatch?: ImportBatchBanner;
}) {
  const [query, setQuery] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      if (q && !p.name.toLowerCase().includes(q)) return false;
      if (categoryId && p.category?.documentId !== categoryId) return false;
      if (statusFilter === 'live' && !p.publishedAt) return false;
      if (statusFilter === 'draft' && p.publishedAt) return false;
      return true;
    });
  }, [products, query, categoryId, statusFilter]);

  if (products.length === 0) {
    return (
      <div className="mt-10 border border-ink-line p-12 text-center">
        <p className="t-mono text-[11px] uppercase tracking-[0.22em] text-ink-mute">
          Sin productos
        </p>
        <p className="mt-3 text-ink-mute">
          Aún no hay productos en el catálogo. Crea el primero con el botón
          superior.
        </p>
      </div>
    );
  }

  const filterClass =
    'border-0 border-b border-ink-line bg-transparent px-0 py-2 text-sm text-ink focus:border-ink focus:outline-none';

  return (
    <div className="mt-10 space-y-6">
      {importBatch?.fileName ? (
        <div
          data-testid="import-batch-filter-banner"
          aria-live="polite"
          className="flex flex-wrap items-center justify-between gap-4 border border-taupe/40 bg-cream-soft/40 px-5 py-3"
        >
          <p
            data-testid="import-batch-filter-label"
            className="t-mono text-[10px] uppercase tracking-[0.22em] text-ink"
          >
            Filtrando por importación:{' '}
            <span className="font-semibold">
              {importBatch.fileName}
            </span>
            {importBatch.uploadedAt
              ? ` · ${BATCH_DATE.format(new Date(importBatch.uploadedAt))}`
              : ''}
          </p>
          <Link
            href="/admin"
            data-testid="import-batch-filter-clear"
            className="t-mono text-[10px] uppercase tracking-[0.22em] text-taupe-deep underline underline-offset-4 hover:text-ink"
          >
            Quitar filtro
          </Link>
        </div>
      ) : null}
      <div className="grid grid-cols-1 gap-4 border-b border-ink-line pb-6 sm:grid-cols-[1fr_auto_auto] sm:items-end">
        <label className="block">
          <span className="t-mono block text-[10px] uppercase tracking-[0.22em] text-ink-mute">
            Buscar por nombre
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="escritorio, silla…"
            className={filterClass}
          />
        </label>
        <label className="block">
          <span className="t-mono block text-[10px] uppercase tracking-[0.22em] text-ink-mute">
            Categoría
          </span>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className={filterClass}
          >
            <option value="">Todas</option>
            {categories.map((c) => (
              <option key={c.documentId} value={c.documentId}>
                {c.name}
                {c.active ? '' : ' (inactiva)'}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="t-mono block text-[10px] uppercase tracking-[0.22em] text-ink-mute">
            Estado
          </span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className={filterClass}
          >
            <option value="all">Todos</option>
            <option value="live">Publicados</option>
            <option value="draft">Borradores</option>
          </select>
        </label>
      </div>

      {filtered.length === 0 ? (
        <div className="border border-ink-line p-10 text-center">
          <p className="t-mono text-[11px] uppercase tracking-[0.22em] text-ink-mute">
            Sin resultados
          </p>
          <p className="mt-3 text-ink-mute">
            Ningún producto coincide con los filtros activos.
          </p>
        </div>
      ) : (
        <div className="border-t border-ink">
          <ul role="list" className="divide-y divide-ink-line">
            {filtered.map((p) => {
              const cover = coverUrl(p);
              const isLive = Boolean(p.publishedAt);
              return (
                <li key={p.documentId}>
                  <Link
                    href={`/admin/productos/${p.documentId}` as never}
                    className="group grid grid-cols-12 items-center gap-4 py-5 transition-colors duration-300 hover:bg-cream-soft/40 sm:gap-6"
                  >
                    <div className="img-zoom relative col-span-2 aspect-square overflow-hidden bg-cream-soft sm:col-span-1">
                      {cover ? (
                        <Image
                          src={cover}
                          alt={p.name}
                          fill
                          sizes="(min-width: 640px) 80px, 64px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <span className="t-mono text-[9px] uppercase tracking-[0.22em] text-ink-soft">
                            N/A
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="col-span-7 sm:col-span-5">
                      <p className="t-mono text-[10px] uppercase tracking-[0.22em] text-taupe-deep">
                        {p.category?.name ?? 'Sin categoría'}
                      </p>
                      <p className="t-h2 mt-1 text-base text-ink transition-colors duration-300 group-hover:text-taupe-deep sm:text-lg">
                        {p.name}
                      </p>
                      <p className="t-mono mt-1 text-[10px] uppercase tracking-[0.22em] text-ink-soft">
                        {p.slug}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span
                          data-testid="origen-badge"
                          className={`t-mono inline-block px-2 py-0.5 text-[10px] uppercase tracking-[0.22em] ${
                            p.importSource === 'imported'
                              ? 'border border-taupe text-taupe-deep'
                              : 'border border-ink-line text-ink-mute'
                          }`}
                        >
                          Origen · {p.importSource === 'imported' ? 'Excel' : 'Manual'}
                        </span>
                        <span
                          data-testid="ultima-importacion"
                          className="t-mono text-[10px] uppercase tracking-[0.22em] text-ink-soft"
                        >
                          Última importación ·{' '}
                          {p.importBatch?.fileName
                            ? `${p.importBatch.fileName}${
                                formatBatchStamp(p.importBatch.uploadedAt)
                                  ? ` · ${formatBatchStamp(p.importBatch.uploadedAt)}`
                                  : ''
                              }`
                            : '—'}
                        </span>
                      </div>
                    </div>

                    <div className="col-span-3 hidden text-right sm:col-span-3 sm:block">
                      <p className="t-mono text-[10px] uppercase tracking-[0.22em] text-ink-soft">
                        Precio
                      </p>
                      <p className="t-mono mt-1 text-sm text-ink">
                        {priceLabel(p)}
                      </p>
                    </div>

                    <div className="col-span-3 hidden text-right sm:col-span-2 sm:block">
                      <p className="t-mono text-[10px] uppercase tracking-[0.22em] text-ink-soft">
                        Estado
                      </p>
                      <p
                        className={`t-mono mt-1 inline-block px-2 py-0.5 text-[10px] uppercase tracking-[0.22em] ${
                          isLive
                            ? 'border border-ink text-ink'
                            : 'border border-taupe text-taupe-deep'
                        }`}
                      >
                        {isLive ? 'Publicado' : 'Borrador'}
                      </p>
                    </div>

                    <div className="col-span-12 -mt-2 flex items-center justify-between text-right sm:col-span-1 sm:mt-0 sm:justify-end">
                      <span className="t-mono text-[10px] uppercase tracking-[0.22em] text-ink-soft sm:hidden">
                        {isLive ? 'Publicado' : 'Borrador'}
                      </span>
                      <span
                        aria-hidden
                        className="inline-flex h-8 w-8 items-center justify-center border border-ink text-sm text-ink transition-all duration-300 group-hover:border-taupe-deep group-hover:bg-ink group-hover:text-paper"
                      >
                        →
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <p className="t-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
        {filtered.length} de {products.length} productos
      </p>
    </div>
  );
}