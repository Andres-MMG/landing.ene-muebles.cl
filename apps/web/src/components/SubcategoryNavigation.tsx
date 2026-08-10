"use client";

import type { ProductSubcategoryGroup } from "@/lib/product-groups";

type SubcategoryNavigationProps = {
  groups: ProductSubcategoryGroup[];
};

export function focusSubcategoryTarget(id: string) {
  document.getElementById(id)?.focus();
}

export function SubcategoryNavigation({ groups }: SubcategoryNavigationProps) {
  return (
    <nav aria-label="Subcategorías de esta página" className="border-y border-ink-line py-4">
      <p className="t-mono mb-3 text-[10px] uppercase tracking-[0.22em] text-ink-soft">
        Ver por subcategoría
      </p>
      <ul className="flex flex-wrap gap-x-5 gap-y-3">
        {groups.map((group) => (
          <li key={group.id}>
            <a
              href={`#${group.id}`}
              onClick={() => focusSubcategoryTarget(group.id)}
              className="t-label inline-flex items-baseline gap-2 text-ink underline-offset-[6px] transition-colors hover:text-taupe-deep hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink"
            >
              {group.name}
              <span className="t-mono text-[10px] text-ink-soft">{group.products.length}</span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
