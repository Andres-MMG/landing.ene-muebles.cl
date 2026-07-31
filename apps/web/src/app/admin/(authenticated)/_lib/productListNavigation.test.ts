import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const appRoot = join(process.cwd(), "apps/web/src/app/admin/(authenticated)");
const source = (path: string) => readFileSync(join(appRoot, path), "utf8");

describe("product-list canonical navigation", () => {
  it("returns edited, created, and deleted products through the preserved list state", () => {
    const form = source("productos/ProductForm.tsx");
    const deleteButton = source("productos/[id]/DeleteProductButton.tsx");

    expect(form).toContain('productListReturnTarget(searchParams.get("from"))');
    expect(form).toContain("router.push(returnTo as never)");
    expect(form).toContain("encodeURIComponent(returnTo)");
    expect(deleteButton).toContain("window.location.href = returnTo");
  });

  it("carries the current list URL through the new-product link", () => {
    const newProductLink = source("NewProductLink.tsx");
    expect(newProductLink).toContain("initialFrom");
    expect(newProductLink).toContain("window.location.pathname");
    expect(newProductLink).toContain("window.location.search");
    expect(newProductLink).toContain("encodeURIComponent(from)");
    expect(newProductLink).toContain(
      'window.addEventListener("admin-product-list-state", syncHref)',
    );
  });

  it("uses the canonical product-list route in breadcrumb and import workflow links", () => {
    const breadcrumb = source("productos/Breadcrumb.tsx");
    const importHistory = source("importaciones/page.tsx");

    expect(breadcrumb).not.toContain("href: '/admin'");
    expect(breadcrumb).toContain('productListReturnTarget(searchParams.get("from"))');
    expect(importHistory).toContain("/admin/productos?importBatch=");
    expect(importHistory).toContain('href="/admin/productos"');
  });
});
