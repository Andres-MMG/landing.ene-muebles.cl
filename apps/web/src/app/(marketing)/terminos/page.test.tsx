import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getLegalPage = vi.hoisted(() => vi.fn());

vi.mock("@/lib/legal-pages", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/legal-pages")>();
  return { ...actual, getLegalPage };
});

import { getLegalFallback } from "@/lib/legal-pages";

beforeEach(() => {
  vi.clearAllMocks();
  getLegalPage.mockResolvedValue(
    getLegalFallback("terms", {
      siteName: "Muebles Prueba",
      contactEmail: "legal@example.cl",
      whatsappNumber: "+56 9 1111 2222",
    }),
  );
});

describe("/terminos route wrapper", () => {
  it("requests the fixed terms document and renders the shared exact fallback semantics", async () => {
    const { default: TermsPage } = await import("./page");
    const html = renderToStaticMarkup(await TermsPage());

    expect(getLegalPage).toHaveBeenCalledOnce();
    expect(getLegalPage).toHaveBeenCalledWith("terms");
    expect(html).toContain("<h1");
    expect(html).toContain("<h2");
    expect(html).toContain("<ol");
    expect(html).toContain('href="#terms-section-1"');
    expect(html).toContain("Muebles Prueba");
    expect(html).toContain("legal@example.cl");
    expect(html).toContain("+56 9 1111 2222");
    expect(html).toContain("Última actualización: enero 2026.");
  });

  it("uses Legal-owned metadata and the fixed canonical", async () => {
    getLegalPage.mockResolvedValue({
      ...getLegalFallback("terms"),
      metadataTitle: "Términos CMS",
      metadataDescription: "Descripción legal CMS",
    });
    const route = await import("./page");
    const metadata = await route.generateMetadata();
    expect(metadata.title).toEqual({ absolute: "Términos CMS · ENE-MUEBLES" });
    expect(metadata.alternates).toEqual({ canonical: "https://ene-muebles.cl/terminos" });
    expect(metadata.openGraph).toMatchObject({
      url: "https://ene-muebles.cl/terminos",
      description: "Descripción legal CMS",
    });
    expect(metadata.twitter).toMatchObject({
      card: "summary_large_image",
      description: "Descripción legal CMS",
    });
  });

  it("keeps the fixed metadata and revalidation contract", async () => {
    const route = await import("./page");
    expect(route.revalidate).toBe(3600);
    const metadata = await route.generateMetadata();
    expect(metadata.title).toEqual({ absolute: "Términos y condiciones · ENE-MUEBLES" });
    expect(metadata.description).toBe(
      "Términos y condiciones que regulan el uso del sitio web de Ene Muebles y la relación comercial con clientes institucionales.",
    );
  });
});
