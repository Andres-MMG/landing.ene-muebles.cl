"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ChangeEvent } from "react";

type CatalogSearchProps = {
  /** Current `?q=` value, used as the initial input value. */
  defaultValue?: string;
};

/**
 * CatalogSearch — server-driven search input. Every keystroke is
 * debounced (350ms) and then pushed to the CURRENT page with `?q=...`
 * (page resets because no `page` param is sent); the server component
 * re-renders with the filtered, paginated list. Works on both
 * `/catalogo` and `/categoria/[slug]` because the push URL is derived
 * from `usePathname()` — the category slug is preserved, `q` is set or
 * cleared, and `page` is dropped so search always restarts at page 1.
 */
export function CatalogSearch({ defaultValue = "" }: CatalogSearchProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [value, setValue] = useState(defaultValue);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const next = event.target.value;
    setValue(next);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const q = next.trim();
      const href = q ? `${pathname}?q=${encodeURIComponent(q)}` : pathname;
      router.push(href as never);
    }, 350);
  };

  return (
    <div>
      <label
        htmlFor="catalog-search"
        className="t-mono block text-[10px] uppercase tracking-[0.22em] text-ink-soft-text"
      >
        Buscar
      </label>
      <input
        id="catalog-search"
        type="search"
        value={value}
        onChange={handleChange}
        placeholder="Buscar productos…"
        autoComplete="off"
        className="mt-2 w-full border-b border-ink-line bg-transparent pb-2 text-base text-ink outline-none transition-colors placeholder:text-ink-soft-text focus:border-ink"
      />
    </div>
  );
}
