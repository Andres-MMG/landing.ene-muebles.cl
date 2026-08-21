import Link from "next/link";

type PaginationProps = {
  total: number;
  page: number;
  pageSize: number;
  /** Route prefix for the page links, e.g. `/catalogo` or `/categoria/escolar`. */
  basePath: string;
  /** Preserved on every link so searches survive pagination. */
  q?: string;
  /** Preserved on every link when a subcategory filter is active. */
  subcategory?: string;
};

/**
 * Build the page-1 href without the `page` param (and without `q`
 * when absent) so the URL stays clean for default state.
 */
const buildHref = (basePath: string, page: number, q?: string, subcategory?: string): string => {
  const params = new URLSearchParams();
  if (page > 1) params.set("page", String(page));
  if (q) params.set("q", q);
  if (subcategory) params.set("subcategory", subcategory);
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
};

/**
 * Numbered page list: first/last always visible, a window of ±1 around
 * the current page, and ellipses for any gap.
 */
const buildPageList = (current: number, pageCount: number): (number | "…")[] => {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, i) => i + 1);
  const candidates = [...new Set([1, pageCount, current - 1, current, current + 1])]
    .filter((p) => p >= 1 && p <= pageCount)
    .sort((a, b) => a - b);
  const pages: (number | "…")[] = [];
  let previous = 0;
  for (const p of candidates) {
    if (p - previous > 1) pages.push("…");
    pages.push(p);
    previous = p;
  }
  return pages;
};

const idlePill =
  "inline-flex min-w-10 items-center justify-center rounded-full border border-ink/20 px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-ink/70 transition-colors hover:border-ink hover:text-ink";
const activePill =
  "inline-flex min-w-10 items-center justify-center rounded-full border border-ink bg-ink px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-paper";

/**
 * Pagination — numbered page pills with prev/next for the public
 * catalog lists. Renders nothing when everything fits on one page.
 */
export function Pagination({ total, page, pageSize, basePath, q, subcategory }: PaginationProps) {
  const pageCount = Math.ceil(total / pageSize);
  if (pageCount <= 1) return null;

  return (
    <nav
      aria-label="Paginación"
      className="mt-12 flex flex-wrap items-center justify-center gap-2"
    >
      {page > 1 ? (
        <Link
          href={buildHref(basePath, page - 1, q, subcategory) as never}
          className={idlePill}
          aria-label="Página anterior"
        >
          Anterior
        </Link>
      ) : (
        <span className={`${idlePill} pointer-events-none opacity-40`} aria-hidden>
          Anterior
        </span>
      )}

      {buildPageList(page, pageCount).map((entry, index) =>
        entry === "…" ? (
          <span key={`gap-${index}`} className="px-1 text-sm text-ink-mute" aria-hidden>
            …
          </span>
        ) : entry === page ? (
          <span key={entry} aria-current="page" className={activePill}>
            {entry}
          </span>
        ) : (
          <Link
            key={entry}
            href={buildHref(basePath, entry, q, subcategory) as never}
            className={idlePill}
            aria-label={`Ir a la página ${entry}`}
          >
            {entry}
          </Link>
        ),
      )}

      {page < pageCount ? (
        <Link
          href={buildHref(basePath, page + 1, q, subcategory) as never}
          className={idlePill}
          aria-label="Página siguiente"
        >
          Siguiente
        </Link>
      ) : (
        <span className={`${idlePill} pointer-events-none opacity-40`} aria-hidden>
          Siguiente
        </span>
      )}
    </nav>
  );
}
