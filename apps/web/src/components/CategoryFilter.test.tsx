import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CategoryFilter } from "./CategoryFilter";
import type { Category } from "@/lib/strapi";

const categories: Category[] = [
  { id: 1, documentId: "c1", name: "Oficina", slug: "oficina" },
  { id: 2, documentId: "c2", name: "Escolar", slug: "escolar" },
];

/**
 * B1 (U2) — query preservation tests. CategoryFilter is a server
 * component, so `renderToStaticMarkup` exercises the real hrefs.
 */
describe("CategoryFilter — ?q= preservation", () => {
  it("links every line with the active search term appended", () => {
    const html = renderToStaticMarkup(
      createElement(CategoryFilter, { categories, q: "silla" })
    );

    expect(html).toContain('href="/catalogo?q=silla"');
    expect(html).toContain('href="/categoria/oficina?q=silla"');
    expect(html).toContain('href="/categoria/escolar?q=silla"');
  });

  it("keeps plain hrefs when no search is active", () => {
    const html = renderToStaticMarkup(
      createElement(CategoryFilter, { categories, activeSlug: "oficina" })
    );

    expect(html).toContain('href="/catalogo"');
    expect(html).toContain('href="/categoria/oficina"');
    expect(html).not.toContain("?q=");
  });

  it("never emits a page param (filter changes reset to page 1)", () => {
    const html = renderToStaticMarkup(
      createElement(CategoryFilter, { categories, q: "silla" })
    );

    expect(html).not.toContain("page=");
  });

  it("marks the active line with the active pill classes", () => {
    const html = renderToStaticMarkup(
      createElement(CategoryFilter, { categories, activeSlug: "escolar" })
    );

    // Exactly one link carries the active pill, and it is the escolar
    // line (the className renders before the href in the anchor).
    const activePills = html.match(/border-ink bg-ink text-paper/g);
    expect(activePills).toHaveLength(1);
    const activeIdx = html.indexOf("border-ink bg-ink text-paper");
    expect(html.slice(activeIdx)).toMatch(/href="\/categoria\/escolar"/);
    expect(html).toContain('href="/categoria/oficina"');
  });

  it("encodes search terms with special characters", () => {
    const html = renderToStaticMarkup(
      createElement(CategoryFilter, { categories, q: "mesa + silla" })
    );

    expect(html).toContain('href="/catalogo?q=mesa%20%2B%20silla"');
  });
});
