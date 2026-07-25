import Link from "next/link";
import type { Category } from "@/lib/strapi";

type CategoryFilterProps = {
  categories: Category[];
  activeSlug?: string;
};

export function CategoryFilter({ categories, activeSlug }: CategoryFilterProps) {
  return (
    <nav
      aria-label="Filtrar por categoría"
      className="flex flex-wrap items-center gap-2 sm:gap-3"
    >
      <Link
        href="/catalogo"
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
            href={`/categoria/${category.slug}` as any}
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
