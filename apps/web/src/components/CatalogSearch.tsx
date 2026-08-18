"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ChangeEvent } from "react";

type CatalogSearchProps = {
  /** Current `?q=` value, used as the initial input value. */
  defaultValue?: string;
};

/**
 * CatalogSearch — server-driven, dynamic search input. Every keystroke is
 * debounced (350ms) and then pushed to the CURRENT page with `?q=...`
 * (page resets because no `page` param is sent); the server component
 * re-renders with the filtered, paginated list. Works on both
 * `/catalogo` and `/categoria/[slug]` because the push URL is derived
 * from `usePathname()` — the category slug is preserved, `q` is set or
 * cleared, and `page` is dropped so search always restarts at page 1.
 *
 * The input is NEVER remounted (pages must not pass a `key`): focus stays
 * in the field while the results update in place, so typing keeps working
 * after every search roundtrip. The local value re-syncs from the
 * `defaultValue` prop whenever the URL changes for another reason (the
 * "Limpiar" link, category links, pointer-driven back/forward) — but only
 * while the field is NOT focused, so a slow server echo can never clobber
 * the keystrokes the user typed while waiting (e.g. the trailing space
 * before the next word). Keyboard back/forward (Alt+←/→) does not blur
 * the field, so that rare case self-heals on the next keystroke.
 * `router.replace` keeps the browser history clean instead of stacking
 * one entry per keystroke. Note: switching route families (e.g.
 * `/catalogo` ↔ `/categoria/[slug]`) unmounts the component, so the
 * field value comes from the `useState` initializer, not the sync block.
 */
export function CatalogSearch({ defaultValue = "" }: CatalogSearchProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [value, setValue] = useState(defaultValue);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [focused, setFocused] = useState(false);

  // Keep the field in sync when the URL changes outside of typing
  // (back/forward, "Limpiar", category navigation). This is the
  // React-documented "adjust state during render" pattern (no effect).
  // While the user has the field focused, the echo of our own debounced
  // push is ignored so mid-search roundtrips cannot truncate what is
  // being typed; external changes (links, back/forward) always blur the
  // field first, so they still sync.
  const [prevDefault, setPrevDefault] = useState(defaultValue);
  if (prevDefault !== defaultValue) {
    setPrevDefault(defaultValue);
    if (!focused) {
      setValue(defaultValue);
    }
  }

  // A scheduled push captures the old pathname; if the user navigates
  // (e.g. a category link) inside the debounce window, cancel it so the
  // search never yanks the navigation back to the previous route.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, [pathname]);

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
      router.replace(href as never);
    }, 350);
  };

  return (
    <div>
      <label
        htmlFor="catalog-search"
        className="t-overline block text-ink-mute"
      >
        Buscar
      </label>
      <input
        id="catalog-search"
        type="search"
        value={value}
        onChange={handleChange}
        onFocus={() => {
          setFocused(true);
        }}
        onBlur={() => {
          setFocused(false);
        }}
        placeholder="Buscar productos…"
        autoComplete="off"
        className="mt-2 w-full border-b border-ink-line bg-transparent pb-2 text-base text-ink outline-none transition-colors placeholder:text-ink-soft-text focus:border-ink"
      />
    </div>
  );
}
