import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  vi.resetModules();
  process.env = { ...ORIGINAL_ENV };
  process.env.STRAPI_INTERNAL_URL = "http://localhost:1337";
  process.env.STRAPI_API_TOKEN = "test-token";
  process.env.NEXT_PUBLIC_SITE_URL = "https://ene-muebles.cl";
});

afterEach(() => {
  process.env = ORIGINAL_ENV;
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/** Mock the `@/lib/strapi` helpers that the page calls. Returns the
 *  `vi` mock so the test can read `mockGetProductBySlug.mock.calls`
 *  if needed. */
function mockStrapi(
  product: Record<string, unknown> | null,
  settings?: unknown,
  contactSection?: unknown,
  relatedProducts: Array<Record<string, unknown>> = [],
) {
  const getContactCTASection = vi.fn().mockResolvedValue(contactSection ?? {});
  vi.doMock("@/lib/strapi", () => ({
    getProductBySlug: vi.fn().mockResolvedValue(product),
    getProducts: vi.fn().mockResolvedValue({
      products: relatedProducts,
      total: relatedProducts.length,
    }),
    getContactCTASection,
    getSiteSettings: vi.fn().mockResolvedValue(
      settings ?? {
        siteName: "Ene Muebles",
        contactEmail: "hola@ene-muebles.cl",
        whatsappNumber: "+56912345678",
      },
    ),
    formatPrice: (p: { price: number; currency: string }) =>
      new Intl.NumberFormat("es-CL", {
        style: "currency",
        currency: p.currency,
        maximumFractionDigits: 0,
      }).format(p.price),
  }));
  return { getContactCTASection };
}

describe("producto/[slug] — generateMetadata", () => {
  it("renders a fallback title when the product is missing", async () => {
    mockStrapi(null);
    const mod = await import("@/app/(marketing)/producto/[slug]/page");
    const metadata = await mod.generateMetadata({
      params: Promise.resolve({ slug: "nope" }),
    });
    expect(metadata.title).toEqual({ absolute: "Producto · Ene Muebles" });
    expect(metadata.alternates).toEqual({ canonical: null });
    expect(metadata.openGraph).not.toHaveProperty("url");
  });

  it("uses shortDescription verbatim when no catalog-import fields are populated", async () => {
    mockStrapi({
      id: 1,
      documentId: "doc-1",
      name: "Silla escolar",
      slug: "silla-escolar",
      description: "Descripción técnica.",
      shortDescription: "Silla de melamina.",
      price: 89900,
      currency: "CLP",
    });
    const mod = await import("@/app/(marketing)/producto/[slug]/page");
    const metadata = await mod.generateMetadata({
      params: Promise.resolve({ slug: "silla-escolar" }),
    });
    expect(metadata.description).toBe("Silla de melamina.");
    expect(metadata.openGraph?.description).toBe("Silla de melamina.");
  });

  it("falls back to description when shortDescription is missing", async () => {
    mockStrapi({
      id: 1,
      documentId: "doc-1",
      name: "Silla escolar",
      slug: "silla-escolar",
      description: "Descripción técnica.",
      price: 89900,
      currency: "CLP",
    });
    const mod = await import("@/app/(marketing)/producto/[slug]/page");
    const metadata = await mod.generateMetadata({
      params: Promise.resolve({ slug: "silla-escolar" }),
    });
    expect(metadata.description).toBe("Descripción técnica.");
  });

  it("weaves catalog-import attributes into the meta description when present", async () => {
    mockStrapi({
      id: 1,
      documentId: "doc-1",
      name: "Silla escolar",
      slug: "silla-escolar",
      description: "Descripción técnica.",
      shortDescription: "Silla apilable.",
      price: 89900,
      currency: "CLP",
      subcategory: "Sillas y asientos",
      observableColor: "Madera natural y blanco",
      observableMaterial: "Melamina 18 mm",
      usageEnvironment: "Sala cuna / educación inicial",
    });
    const mod = await import("@/app/(marketing)/producto/[slug]/page");
    const metadata = await mod.generateMetadata({
      params: Promise.resolve({ slug: "silla-escolar" }),
    });
    expect(metadata.description).toBe(
      "Silla apilable. · Subcategoría: Sillas y asientos · Color: Madera natural y blanco · Material: Melamina 18 mm · Uso: Sala cuna / educación inicial",
    );
  });

  it("caps openGraph.description at ≤ 200 chars", async () => {
    const long = "Una descripción muy larga ".repeat(20).trim();
    mockStrapi({
      id: 1,
      documentId: "doc-1",
      name: "Silla",
      slug: "silla",
      description: "d",
      shortDescription: long,
      price: 89900,
      currency: "CLP",
    });
    const mod = await import("@/app/(marketing)/producto/[slug]/page");
    const metadata = await mod.generateMetadata({
      params: Promise.resolve({ slug: "silla" }),
    });
    expect((metadata.openGraph?.description as string).length).toBeLessThanOrEqual(200);
  });

  it("always emits the theme-color meta tag", async () => {
    mockStrapi({
      id: 1,
      documentId: "doc-1",
      name: "Silla",
      slug: "silla",
      description: "d",
      price: 89900,
      currency: "CLP",
    });
    const mod = await import("@/app/(marketing)/producto/[slug]/page");
    const metadata = await mod.generateMetadata({
      params: Promise.resolve({ slug: "silla" }),
    });
    expect(metadata.other?.["theme-color"]).toBe("#1a1a1a");
  });

  it("emits product:retailer_item_id when externalId is set", async () => {
    mockStrapi({
      id: 1,
      documentId: "doc-1",
      name: "Silla",
      slug: "silla",
      description: "d",
      price: 89900,
      currency: "CLP",
      externalId: "CAT-2025-001",
    });
    const mod = await import("@/app/(marketing)/producto/[slug]/page");
    const metadata = await mod.generateMetadata({
      params: Promise.resolve({ slug: "silla" }),
    });
    expect(metadata.other?.["product:retailer_item_id"]).toBe("CAT-2025-001");
  });

  it("OMITS product:retailer_item_id when externalId is missing", async () => {
    mockStrapi({
      id: 1,
      documentId: "doc-1",
      name: "Silla",
      slug: "silla",
      description: "d",
      price: 89900,
      currency: "CLP",
    });
    const mod = await import("@/app/(marketing)/producto/[slug]/page");
    const metadata = await mod.generateMetadata({
      params: Promise.resolve({ slug: "silla" }),
    });
    expect(metadata.other?.["product:retailer_item_id"]).toBeUndefined();
  });

  it("canonical points at the absolute product URL", async () => {
    mockStrapi({
      id: 1,
      documentId: "doc-1",
      name: "Silla",
      slug: "silla-escolar",
      description: "d",
      price: 89900,
      currency: "CLP",
    });
    const mod = await import("@/app/(marketing)/producto/[slug]/page");
    const metadata = await mod.generateMetadata({
      params: Promise.resolve({ slug: "silla-escolar" }),
    });
    expect(metadata.alternates?.canonical).toBe("https://ene-muebles.cl/producto/silla-escolar");
  });
});

describe("producto/[slug] — JSON-LD additionalProperty payload", () => {
  // The page calls `buildProductJsonLd` from `@/lib/product-attributes`,
  // which is itself covered by `product-attributes.test.ts`. This block
  // pins the integration: the page wires the helper output into a
  // `<script type="application/ld+json">` payload AND appends the
  // additional `additionalProperty` entries from `buildJsonLdAdditionalProperty`
  // when present.
  it("emits an additionalProperty entry for every populated catalog-import field", async () => {
    const { buildProductJsonLd, buildJsonLdAdditionalProperty } = await import(
      "@/lib/product-attributes"
    );
    const product = {
      id: 1,
      documentId: "doc-1",
      name: "Silla",
      slug: "silla",
      description: "d",
      price: 89900,
      currency: "CLP",
      productType: "Silla",
      subcategory: "Sillas y asientos",
      usageEnvironment: "Sala cuna",
      observableColor: "Madera natural",
      observableMaterial: "Melamina 18 mm",
      catalogPage: 2,
    };
    const jsonLd = buildProductJsonLd(
      product as Parameters<typeof buildProductJsonLd>[0],
      "https://ene-muebles.cl",
    );
    const additional = buildJsonLdAdditionalProperty(product);
    if (additional.length > 0) jsonLd.additionalProperty = additional;
    expect(jsonLd.additionalProperty).toEqual([
      { "@type": "PropertyValue", name: "productType", value: "Silla" },
      { "@type": "PropertyValue", name: "subcategory", value: "Sillas y asientos" },
      { "@type": "PropertyValue", name: "usageEnvironment", value: "Sala cuna" },
      { "@type": "PropertyValue", name: "observableColor", value: "Madera natural" },
      { "@type": "PropertyValue", name: "observableMaterial", value: "Melamina 18 mm" },
      { "@type": "PropertyValue", name: "catalogPage", value: 2 },
    ]);
  });

  it("omits additionalProperty entirely when no catalog-import field is populated", async () => {
    const { buildProductJsonLd, buildJsonLdAdditionalProperty } = await import(
      "@/lib/product-attributes"
    );
    const product = {
      id: 1,
      documentId: "doc-1",
      name: "Silla",
      slug: "silla",
      description: "d",
      price: 89900,
      currency: "CLP",
    };
    const jsonLd = buildProductJsonLd(
      product as unknown as Parameters<typeof buildProductJsonLd>[0],
      "https://ene-muebles.cl",
    );
    const additional = buildJsonLdAdditionalProperty(product as never);
    if (additional.length > 0) jsonLd.additionalProperty = additional;
    expect("additionalProperty" in jsonLd).toBe(false);
  });

  it("preserves verified core fields and appends catalog properties once", async () => {
    const { buildProductJsonLd } = await import("@/lib/product-attributes");
    const product = {
      id: 1,
      documentId: "doc-1",
      name: "Silla",
      slug: "silla",
      description: "d",
      price: 89900,
      currency: "CLP",
      category: { id: 1, documentId: "cat-1", name: "Escolar", slug: "escolar" },
      productType: "Silla",
    };
    const jsonLd = buildProductJsonLd(
      product as Parameters<typeof buildProductJsonLd>[0],
      "https://ene-muebles.cl",
    );
    // Every legacy field is intact, even after the catalog-import
    // properties are appended.
    expect(jsonLd["@type"]).toBe("Product");
    expect(jsonLd.name).toBe("Silla");
    expect(jsonLd.category).toBe("Escolar");
    expect(jsonLd.brand).toEqual({ "@type": "Brand", name: "ENE-MUEBLES" });
    expect(jsonLd.offers).toMatchObject({
      "@type": "Offer",
      url: "https://ene-muebles.cl/producto/silla",
      price: 89900,
      priceCurrency: "CLP",
    });
  });
});

describe("producto/[slug] — public price visibility", () => {
  const product = (price: number) => ({
    id: 1,
    documentId: "doc-1",
    name: "Mesa institucional",
    slug: "mesa-institucional",
    description: "Mesa de prueba.",
    price,
    currency: "CLP",
  });

  it("hides price markup when the product price is zero", async () => {
    mockStrapi(product(0));
    const { default: ProductDetailPage } = await import("./page");
    const html = renderToStaticMarkup(
      await ProductDetailPage({ params: Promise.resolve({ slug: "mesa-institucional" }) }),
    );

    expect(html).not.toContain("$0");
    expect(html).not.toContain("t-mono mt-4 text-2xl text-ink");
  });

  it("renders the formatted price when the product price is positive", async () => {
    mockStrapi(product(89900));
    const { default: ProductDetailPage } = await import("./page");
    const html = renderToStaticMarkup(
      await ProductDetailPage({ params: Promise.resolve({ slug: "mesa-institucional" }) }),
    );

    expect(html).toContain("$89.900");
    expect(html).toContain("t-mono mt-4 text-2xl text-ink");
  });

  it("routes the email CTA to the shared form and preserves WhatsApp", async () => {
    mockStrapi(product(89900));
    const { default: ProductDetailPage } = await import("./page");
    const html = renderToStaticMarkup(
      await ProductDetailPage({ params: Promise.resolve({ slug: "mesa-institucional" }) }),
    );

    expect(html).toContain('href="/contacto?product=mesa-institucional"');
    expect(html).not.toContain("mailto:hola@ene-muebles.cl?subject=");
    expect(html).toContain("Consultar por WhatsApp");
    expect(html).toContain("Enviar correo");
  });

  it("uses trimmed detail overrides and propagates card copy to related products", async () => {
    const mainProduct = {
      ...product(89900),
      category: { id: 1, name: "Oficina", slug: "oficina" },
    };
    mockStrapi(
      mainProduct,
      {
        whatsappNumber: "+56912345678",
        productDetailWhatsappLabel: "  WhatsApp detalle CMS  ",
        productDetailContactLabel: "  Contacto detalle CMS  ",
        productCardDetailLabel: "  Ficha relacionada CMS  ",
        productCardWhatsappLabel: "  WhatsApp relacionado CMS  ",
        whatsappProductMessageTemplate: "Proyecto: {productName} & cotización.",
      },
      undefined,
      [
        {
          id: 2,
          name: "Silla relacionada",
          slug: "silla-relacionada",
          description: "Silla de prueba.",
          price: 0,
          currency: "CLP",
        },
      ],
    );
    const { default: ProductDetailPage } = await import("./page");
    const html = renderToStaticMarkup(
      await ProductDetailPage({ params: Promise.resolve({ slug: "mesa-institucional" }) }),
    );

    expect(html).toContain("WhatsApp detalle CMS");
    expect(html).toContain("Contacto detalle CMS");
    expect(html).toContain("Ficha relacionada CMS");
    expect(html).toContain("WhatsApp relacionado CMS");
    expect(html).toContain(
      'href="https://wa.me/56912345678?text=Proyecto%3A%20Mesa%20institucional%20%26%20cotizaci%C3%B3n."',
    );
    expect(html).toContain(
      'href="https://wa.me/56912345678?text=Proyecto%3A%20Silla%20relacionada%20%26%20cotizaci%C3%B3n."',
    );
    expect(html).toContain('href="/contacto?product=mesa-institucional"');
  });
  it("encodes the product slug in the contact-form URL", async () => {
    const encodedProduct = {
      ...product(89900),
      slug: "silla norte/ñ",
    };
    mockStrapi(encodedProduct);
    const { default: ProductDetailPage } = await import("./page");
    const html = renderToStaticMarkup(
      await ProductDetailPage({ params: Promise.resolve({ slug: encodedProduct.slug }) }),
    );

    expect(html).toContain('href="/contacto?product=silla%20norte%2F%C3%B1"');
  });

  it("renders the Contact CTA singleton copy", async () => {
    const { getContactCTASection } = mockStrapi(product(89900), undefined, {
      title: "Product page CMS CTA",
      body: "Product page CMS body",
      buttonLabel: "Ask for a quote",
      buttonHref: "/contacto",
    });
    const { default: ProductDetailPage } = await import("./page");
    const html = renderToStaticMarkup(
      await ProductDetailPage({ params: Promise.resolve({ slug: "mesa-institucional" }) }),
    );

    expect(getContactCTASection).toHaveBeenCalledOnce();
    expect(html).toContain("Product page CMS CTA");
    expect(html).toContain("Product page CMS body");
    expect(html).toContain('href="/contacto"');
    expect(html).toContain("Ask for a quote");
  });
});
