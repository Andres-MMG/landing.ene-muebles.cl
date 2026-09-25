import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import LegalSelectorPage from "./page";

describe("/admin/legal selector", () => {
  it("exposes exactly the two fixed legal choices and no dynamic editor link", () => {
    const html = renderToStaticMarkup(<LegalSelectorPage />);
    const hrefs = [...html.matchAll(/href="([^"]+)"/g)].map((match) => match[1]);

    expect(hrefs).toEqual(["/admin/legal/terminos", "/admin/legal/privacidad"]);
    expect(html).toContain("Términos y condiciones");
    expect(html).toContain("Política de privacidad");
    expect(html).not.toContain("[code]");
    expect(html).not.toContain("/admin/legal/nuevo");
  });
});
