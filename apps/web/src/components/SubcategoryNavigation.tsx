"use client";

import type {
  ProductSubcategoryGroup,
  ProductSubcategorySummary,
} from "@/lib/product-groups";

type SubcategoryNavigationProps = {
  groups: Array<ProductSubcategoryGroup | ProductSubcategorySummary>;
  q?: string;
};

export function focusSubcategoryTarget(id: string) {
  document.getElementById(id)?.focus();
}

export function SubcategoryNavigation({ groups, q }: SubcategoryNavigationProps) {
  return (
    <nav aria-label="Subcategorías del catálogo" className="border-y border-ink-line py-4">
      <p className="t-overline mb-3 text-ink-mute">
        Ver por subcategoría
      </p>
      <ul className="flex flex-wrap gap-x-5 gap-y-3">
        {groups.map((group) => {
          const isSummary = "count" in group;
          const href = isSummary
            ? `/catalogo?subcategory=${encodeURIComponent(group.name)}${q ? `&q=${encodeURIComponent(q)}` : ""}`
            : `#${group.id}`;

          return (
          <li key={group.id}>
            <a
              href={href}
              onClick={isSummary ? undefined : () => focusSubcategoryTarget(group.id)}
              className="t-label inline-flex items-baseline gap-2 text-ink underline-offset-[6px] transition-colors hover:text-taupe-text hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink"
            >
              {group.name}
              <span className="t-mono text-xs text-ink-mute">
                {isSummary ? group.count : group.products.length}
              </span>
            </a>
          </li>
          );
        })}
      </ul>
    </nav>
  );
}
