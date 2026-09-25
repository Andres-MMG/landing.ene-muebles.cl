import { describe, expect, it } from "vitest";
import { buildSeoMetadata, FALLBACK_SHARE_IMAGE_ALT } from "./seo-metadata";

describe("buildSeoMetadata", () => {
  it("builds complete route-owned canonical, Open Graph, and Twitter metadata", () => {
    const metadata = buildSeoMetadata({
      title: "Catálogo",
      description: "Descripción editorial",
      path: "/catalogo",
      siteName: "ENE-MUEBLES",
    });

    expect(metadata.title).toEqual({ absolute: "Catálogo · ENE-MUEBLES" });
    expect(metadata.applicationName).toBe("ENE-MUEBLES");
    expect(metadata.alternates).toEqual({ canonical: "https://ene-muebles.cl/catalogo" });
    expect(metadata.openGraph).toMatchObject({
      type: "website",
      locale: "es_CL",
      siteName: "ENE-MUEBLES",
      url: "https://ene-muebles.cl/catalogo",
      title: "Catálogo · ENE-MUEBLES",
      description: "Descripción editorial",
      images: [{ url: "https://ene-muebles.cl/opengraph-image", alt: FALLBACK_SHARE_IMAGE_ALT }],
    });
    expect(metadata.twitter).toMatchObject({
      card: "summary_large_image",
      title: "Catálogo · ENE-MUEBLES",
      description: "Descripción editorial",
      images: ["https://ene-muebles.cl/opengraph-image"],
    });
  });

  it("omits a canonical when a dynamic entity is missing", () => {
    const metadata = buildSeoMetadata({ title: "Producto", description: "No encontrado" });
    expect(metadata.alternates).toEqual({ canonical: null });
    expect(metadata.openGraph).not.toHaveProperty("url");
  });
});
