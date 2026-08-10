"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ChangeEvent } from "react";

type CatalogSearchProps = {
  /** Current `?q=` value, used as the initial input value. */
  defaultValue?: string;
};

/**
 * CatalogSearch — server-driven search input. Every keystroke is
 * debounced (350ms) and then pushed to `/catalogo?q=...`; the server
 * component re-renders with the filtered, paginated list (page
 * resets because no `page` param is sent). Cleared input returns to
 * the plain catalog.
 */
export function CatalogSearch({ defaultValue = "" }: CatalogSearchProps) {
  const router = useRouter();
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
      const href = q ? `/catalogo?q=${encodeURIComponent(q)}` : "/catalogo";
      router.push(href as never);
    }, 350);
  };

  return (
    <div>
      <label
        htmlFor="catalog-search"
        className="t-mono block text-[10px] uppercase tracking-[0.22em] text-ink-soft"
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
        className="mt-2 w-full border-b border-ink-line bg-transparent pb-2 text-base text-ink outline-none transition-colors placeholder:text-ink-mute/60 focus:border-ink"
      />
    </div>
  );
}
