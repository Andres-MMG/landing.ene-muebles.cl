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
    getLegalFallback("privacy", {
      siteName: "Muebles Prueba",
      contactEmail: "privacidad@example.cl",
      whatsappNumber: "+56 9 3333 4444",
    }),
  );
});

describe("/privacidad route wrapper", () => {
  it("requests the fixed privacy document and renders the shared exact fallback semantics", async () => {
    const { default: PrivacyPage } = await import("./page");
    const html = renderToStaticMarkup(await PrivacyPage());

    expect(getLegalPage).toHaveBeenCalledOnce();
    expect(getLegalPage).toHaveBeenCalledWith("privacy");
    expect(html).toContain("<h1");
    expect(html).toContain("<h2");
    expect(html).toContain("<ol");
    expect(html).toContain('href="#privacy-section-1"');
    expect(html).toContain("Muebles Prueba");
    expect(html).toContain("privacidad@example.cl");
    expect(html).toContain("Última actualización: enero 2026.");
  });

  it("uses Legal-owned metadata and the fixed canonical", async () => {
    getLegalPage.mockResolvedValue({
      ...getLegalFallback("privacy"),
      metadataTitle: "Privacidad CMS",
      metadataDescription: "Descripción legal CMS",
    });
    const route = await import("./page");
    const metadata = await route.generateMetadata();
    expect(metadata.title).toEqual({ absolute: "Privacidad CMS · ENE-MUEBLES" });
    expect(metadata.alternates).toEqual({ canonical: "https://ene-muebles.cl/privacidad" });
    expect(metadata.openGraph).toMatchObject({
      url: "https://ene-muebles.cl/privacidad",
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
    expect(metadata.title).toEqual({ absolute: "Política de privacidad · ENE-MUEBLES" });
    expect(metadata.description).toBe(
      "Cómo Ene Muebles trata los datos personales que recibe a través de su sitio web, canales de contacto y procesos comerciales.",
    );
  });
});
