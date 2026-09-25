import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { getLegalFallback } from "@/lib/legal-pages";
import { LegalPage } from "./LegalPage";

describe("LegalPage", () => {
  it("preserves semantic heading, ordered index, paragraphs, and code-derived anchors", () => {
    const html = renderToStaticMarkup(
      createElement(LegalPage, { page: getLegalFallback("terms") }),
    );
    expect(html).toContain("<h1");
    expect(html).toContain("<h2");
    expect(html).toContain("<ol");
    expect(html).toContain("<p");
    expect(html).toContain('href="#terms-section-1"');
    expect(html).toContain('id="terms-section-1"');
    expect(html).not.toContain("dangerouslySetInnerHTML");
  });

  it("renders the exact current fallback contact copy", () => {
    const html = renderToStaticMarkup(
      createElement(LegalPage, { page: getLegalFallback("terms") }),
    );
    expect(html).toContain("contacto@ene-muebles.cl");
    expect(html).toContain("+569 9539 5339");
    expect(html).toContain("Última actualización: enero 2026.");
  });
});
