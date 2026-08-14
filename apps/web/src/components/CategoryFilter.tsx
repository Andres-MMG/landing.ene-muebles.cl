import Link from "next/link";
import type { Category } from "@/lib/strapi";

type CategoryFilterProps = {
  categories: Category[];
  activeSlug?: string;
  /**
   * B1 (U2) — active `?q=` search term. Preserved on every link so
   * switching lines keeps the search; the `page` param is dropped so
   * a filter change always restarts at page 1.
   */
  q?: string;
};

/** `basePath` + `?q=` when a search is active; the bare path otherwise. */
const buildHref = (basePath: string, q?: string): string => {
  if (!q) return basePath;
  return `${basePath}?q=${encodeURIComponent(q)}`;
};

export function CategoryFilter({ categories, activeSlug, q }: CategoryFilterProps) {
  return (
    <nav
      aria-label="Filtrar por categoría"
      className="flex flex-wrap items-center gap-2 sm:gap-3"
    >
      <Link
        href={buildHref("/catalogo", q) as never}
        className={`rounded-full border px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] transition-colors ${
          !activeSlug
            ? "border-ink bg-ink text-paper"
            : "border-ink/20 text-ink/70 hover:border-ink hover:text-ink"
        }`}
      >
        Todos
      </Link>
      {categories.map((category) => {
        const isActive = activeSlug === category.slug;
        return (
          <Link
            key={category.id}
            href={buildHref(`/categoria/${category.slug}`, q) as never}
            className={`rounded-full border px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] transition-colors ${
              isActive
                ? "border-ink bg-ink text-paper"
                : "border-ink/20 text-ink/70 hover:border-ink hover:text-ink"
            }`}
          >
            {category.name}
          </Link>
        );
      })}
    </nav>
  );
}
