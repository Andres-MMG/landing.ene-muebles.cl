import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * CatalogSearch — focus-preserving dynamic search contract.
 *
 * The repo's vitest environment is `node` (no jsdom), so interactivity
 * is out of reach. Following the existing component test pattern
 * (ContactForm.test.tsx), this suite uses source-level assertions to
 * pin the behaviors that keep the field usable:
 *
 *  - the input must NEVER be remounted while the URL changes
 *    (a `key={q}` on the pages remounts it and drops focus after every
 *    debounced roundtrip — the "can't type two letters" bug);
 *  - the URL must be replaced, not pushed, so keystroke-driven search
 *    does not pile up history entries;
 *  - the local value must re-sync from the URL-provided defaultValue so
 *    back/forward and the "Limpiar" link still update the field.
 */

const componentPath = join(process.cwd(), "apps/web/src/components/CatalogSearch.tsx");
const catalogoPath = join(process.cwd(), "apps/web/src/app/(marketing)/catalogo/page.tsx");
const categoriaPath = join(process.cwd(), "apps/web/src/app/(marketing)/categoria/[slug]/page.tsx");

describe("CatalogSearch — dynamic search contract", () => {
  it("is a client component (navigates from the browser)", () => {
    const source = readFileSync(componentPath, "utf8");
    expect(source).toContain('"use client"');
  });

  it("replaces the URL on debounce instead of pushing history entries", () => {
    const source = readFileSync(componentPath, "utf8");
    expect(source).toContain("router.replace");
    expect(source).not.toContain("router.push");
  });

  it("re-syncs the local value from the URL-provided defaultValue", () => {
    const source = readFileSync(componentPath, "utf8");
    expect(source).toContain("setValue(defaultValue)");
  });

  it("ignores the server echo while the field is focused, so roundtrips cannot clobber keystrokes", () => {
    const source = readFileSync(componentPath, "utf8");
    // Pin the nesting: the guard must wrap the value sync, and prevDefault
    // must advance unconditionally (a mis-wired guard would pass loose
    // token checks while the clobber race is fully broken).
    expect(source).toMatch(/if \(!focused\)\s*\{\s*setValue\(defaultValue\)/);
    expect(source).toMatch(/if \(prevDefault !== defaultValue\) \{\s*setPrevDefault\(defaultValue\);/);
    expect(source).toContain("setFocused(true)");
    expect(source).toContain("setFocused(false)");
  });

  it("cancels a pending debounce when the route changes", () => {
    const source = readFileSync(componentPath, "utf8");
    expect(source).toContain("clearTimeout(debounceRef.current)");
    expect(source).toContain("}, [pathname])");
  });

  it("is never remounted by the catalog pages (no `key`), so focus is kept while typing", () => {
    const catalogo = readFileSync(catalogoPath, "utf8");
    const categoria = readFileSync(categoriaPath, "utf8");
    expect(catalogo).toContain("<CatalogSearch defaultValue={q} />");
    expect(catalogo).not.toContain("CatalogSearch key=");
    expect(categoria).toContain("<CatalogSearch defaultValue={q} />");
    expect(categoria).not.toContain("CatalogSearch key=");
  });
});
