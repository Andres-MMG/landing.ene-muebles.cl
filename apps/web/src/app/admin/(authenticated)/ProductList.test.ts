import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = readFileSync(
  join(process.cwd(), "apps/web/src/app/admin/(authenticated)/ProductList.tsx"),
  "utf8",
);

describe("ProductList interaction contract", () => {
  it("keeps thumbnail downloads lazy and renders an incremental list", () => {
    expect(source).toContain('loading="lazy"');
    expect(source).toContain("IntersectionObserver");
    expect(source).toContain("PAGE_SIZE");
  });

  it("offers keyboard-accessible responsive filters", () => {
    expect(source).toContain("<dialog");
    expect(source).toContain("showModal()");
    expect(source).toContain("Aplicar filtros");
    expect(source).toContain("Limpiar");
    expect(source).toContain('aria-labelledby="product-filters-title"');
    expect(source).toContain('id="product-filters-title"');
  });

  it("persists scroll independently without router updates on scroll", () => {
    expect(source).toContain("sessionStorage");
    expect(source).toContain('window.addEventListener("pagehide", persistScroll)');
    expect(source).toContain('window.addEventListener("beforeunload", persistScroll)');
    expect(source).not.toContain("setTimeout(");
  });

  it("updates shareable state with browser history and restores it on back-forward", () => {
    expect(source).toContain("window.history.replaceState");
    expect(source).toContain('window.addEventListener("popstate", restoreFromHistory)');
    expect(source).not.toContain("router.replace(");
  });

  it("carries the shareable list state into the product editor", () => {
    expect(source).toContain("const returnTo = listQuery");
    expect(source).toContain("encodeURIComponent(returnTo)");
  });

  it("preserves the existing Excel import context with a clear action", () => {
    expect(source).toContain('data-testid="import-batch-filter-banner"');
    expect(source).toContain("Quitar filtro");
    expect(source).toContain("BATCH_DATE.format");
  });
});
