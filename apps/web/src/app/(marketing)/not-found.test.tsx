import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

/**
 * B1 (U4) — Spanish 404 smoke test. The marketing not-found renders the
 * shared NotFoundContent, so this pins the copy + home link contract.
 */
describe("(marketing)/not-found", () => {
  it("renders the Spanish heading, friendly line, and home link", async () => {
    const { default: MarketingNotFound } = await import("./not-found");
    const html = renderToStaticMarkup(MarketingNotFound());

    expect(html).toContain("Página no encontrada.");
    expect(html).toContain("El enlace que seguiste no existe o fue movido.");
    expect(html).toContain('href="/"');
    expect(html).toContain("Volver al inicio");
  });
});
