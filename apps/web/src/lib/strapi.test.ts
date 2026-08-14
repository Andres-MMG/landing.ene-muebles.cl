import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  vi.resetModules();
  process.env = { ...ORIGINAL_ENV };
  process.env.STRAPI_INTERNAL_URL = "http://localhost:1337";
  process.env.STRAPI_API_TOKEN = "test-token";
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
  process.env = ORIGINAL_ENV;
});

const mockFetch = (status: number, body: unknown) => {
  (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
};

describe("getSiteSettings", () => {
  it("returns parsed settings on 200", async () => {
    mockFetch(200, {
      data: {
        id: 1,
        siteName: "Ene Muebles",
        tagline: "Muebles artesanales",
        contactEmail: "contacto@ene-muebles.cl",
        whatsappNumber: "+56912345678",
      },
    });

    const { getSiteSettings } = await import("./strapi");
    const settings = await getSiteSettings();

    expect(settings.siteName).toBe("Ene Muebles");
    expect(settings.tagline).toBe("Muebles artesanales");
    expect(settings.contactEmail).toBe("contacto@ene-muebles.cl");
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("omits cleared social links while preserving populated handles", async () => {
    mockFetch(200, {
      data: {
        id: 1,
        siteName: "Ene Muebles",
        socialLinks: {
          instagram: "enemuebles",
          linkedin: null,
          tiktok: null,
        },
      },
    });

    const { getSiteSettings } = await import("./strapi");
    const settings = await getSiteSettings();

    expect(settings.socialLinks).toEqual({ instagram: "enemuebles" });
  });

  it("rejects social links with non-string, non-null values", async () => {
    mockFetch(200, {
      data: {
        id: 1,
        siteName: "Ene Muebles",
        socialLinks: { instagram: 42 },
      },
    });

    const { getSiteSettings } = await import("./strapi");

    await expect(getSiteSettings()).rejects.toThrow(/malformed socialLinks/);
  });

  it("rejects social links with an invalid object shape", async () => {
    mockFetch(200, {
      data: {
        id: 1,
        siteName: "Ene Muebles",
        socialLinks: ["enemuebles"],
      },
    });

    const { getSiteSettings } = await import("./strapi");

    await expect(getSiteSettings()).rejects.toThrow(/malformed socialLinks/);
  });

  it("returns the minimal fallback on a 404", async () => {
    mockFetch(404, {
      data: null,
      error: { status: 404, name: "NotFoundError", message: "Not Found", details: {} },
    });

    const { getSiteSettings } = await import("./strapi");

    await expect(getSiteSettings()).resolves.toEqual({ siteName: "ENE-MUEBLES" });
  });

  it("rejects a generic JSON 404", async () => {
    mockFetch(404, { error: { status: 404, name: "NotFoundError" } });

    const { getSiteSettings } = await import("./strapi");

    await expect(getSiteSettings()).rejects.toThrow(/404/);
  });

  it("rejects a partial Strapi 404 envelope without error status", async () => {
    mockFetch(404, { data: null, error: { name: "NotFoundError" } });

    const { getSiteSettings } = await import("./strapi");

    await expect(getSiteSettings()).rejects.toThrow(/404/);
  });

  it("rejects an HTML 404", async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response("<html>Not Found</html>", { status: 404 }),
    );

    const { getSiteSettings } = await import("./strapi");

    await expect(getSiteSettings()).rejects.toThrow(/404/);
  });

  it("rejects null data on an HTTP 200 response", async () => {
    mockFetch(200, { data: null });

    const { getSiteSettings } = await import("./strapi");

    await expect(getSiteSettings()).rejects.toThrow(/malformed data/);
  });

  it("rejects authorization failures", async () => {
    mockFetch(403, { error: { message: "Forbidden" } });

    const { getSiteSettings } = await import("./strapi");

    await expect(getSiteSettings()).rejects.toThrow(/403/);
  });

  it("rejects unauthenticated failures", async () => {
    mockFetch(401, { error: { message: "Unauthorized" } });

    const { getSiteSettings } = await import("./strapi");

    await expect(getSiteSettings()).rejects.toThrow(/401/);
  });

  it("rejects server failures", async () => {
    mockFetch(500, { error: { message: "Internal Server Error" } });

    const { getSiteSettings } = await import("./strapi");

    await expect(getSiteSettings()).rejects.toThrow(/500/);
  });

  it("rejects network failures", async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("ECONNREFUSED"));

    const { getSiteSettings } = await import("./strapi");

    await expect(getSiteSettings()).rejects.toThrow(/Network error/);
  });

  it("rejects malformed non-null data", async () => {
    mockFetch(200, { data: { id: 1 } });

    const { getSiteSettings } = await import("./strapi");

    await expect(getSiteSettings()).rejects.toThrow(/malformed data/);
  });

  it("rejects invalid JSON", async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response("not JSON", {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const { getSiteSettings } = await import("./strapi");
    await expect(getSiteSettings()).rejects.toThrow(/Invalid JSON/);
  });

  it("does not expose the bootstrap RUT sentinel", async () => {
    const { getPublicRut } = await import("./strapi");

    expect(getPublicRut("Pending confirmation")).toBeUndefined();
    expect(getPublicRut("  76.123.456-7  ")).toBe("76.123.456-7");
  });
});

describe("public Strapi requests", () => {
  it("omits Authorization when no read token is configured", async () => {
    delete process.env.STRAPI_API_TOKEN;

    const { __internal } = await import("./strapi");

    expect(__internal.buildHeaders()).toEqual({ Accept: "application/json" });
  });
});

describe("getCategories", () => {
  it("returns a normalized array", async () => {
    mockFetch(200, {
      data: [
        { id: 1, name: "Living", slug: "living", active: true, order: 0 },
        {
          id: 2,
          name: "Dormitorio",
          slug: "dormitorio",
          active: true,
          order: 1,
        },
      ],
      meta: {},
    });

    const { getCategories } = await import("./strapi");
    const categories = await getCategories();

    expect(categories).toHaveLength(2);
    expect(categories[0].slug).toBe("living");
    expect(categories[1].slug).toBe("dormitorio");
  });
});

describe("getProducts", () => {
  it("builds the correct query string with category filter", async () => {
    mockFetch(200, {
      data: [
        {
          id: 1,
          name: "Sofá",
          slug: "sofa",
          description: "d",
          price: 100000,
          currency: "CLP",
          active: true,
        },
      ],
    });

    const { getProducts } = await import("./strapi");
    await getProducts({ categorySlug: "living" });

    const url = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as string;
    const decoded = decodeURIComponent(url);
    expect(decoded).toMatch(/filters\[category\]\[slug\]\[\$eq\]=living/);
    expect(decoded).toMatch(/filters\[active\]\[\$eq\]=true/);
    expect(decoded).toMatch(/sort=order/);
    expect(decoded).toMatch(/pagination\[page\]=1/);
    expect(decoded).toMatch(/pagination\[pageSize\]=12/);
  });

  it("adds a case-insensitive name filter when q is provided", async () => {
    mockFetch(200, { data: [], meta: { pagination: { total: 0 } } });

    const { getProducts } = await import("./strapi");
    await getProducts({ q: "mesa" });

    const url = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as string;
    expect(decodeURIComponent(url)).toMatch(/filters\[name\]\[\$containsi\]=mesa/);
  });

  it("clamps page to >= 1", async () => {
    mockFetch(200, { data: [], meta: { pagination: { total: 0 } } });

    const { getProducts } = await import("./strapi");
    await getProducts({ page: 0 });

    const url = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as string;
    expect(decodeURIComponent(url)).toMatch(/pagination\[page\]=1/);
  });

  it("returns products and total from the envelope", async () => {
    mockFetch(200, {
      data: [
        {
          id: 1,
          name: "Sofá",
          slug: "sofa",
          description: "d",
          price: 100000,
          currency: "CLP",
          active: true,
        },
      ],
      meta: { pagination: { page: 1, pageSize: 12, pageCount: 4, total: 37 } },
    });

    const { getProducts } = await import("./strapi");
    const result = await getProducts({ pageSize: 12 });

    expect(result.products).toHaveLength(1);
    expect(result.products[0].name).toBe("Sofá");
    expect(result.total).toBe(37);
  });

  it("returns an empty array and total 0 when no products exist", async () => {
    mockFetch(200, { data: [] });
    const { getProducts } = await import("./strapi");
    const result = await getProducts();
    expect(result.products).toEqual([]);
    expect(result.total).toBe(0);
  });

  it("throws on network error", async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("ECONNREFUSED"));
    const { getProducts } = await import("./strapi");
    await expect(getProducts({ categorySlug: "test" })).rejects.toThrow(/Network error/);
  });
});

describe("getAllProducts", () => {
  it("collects every page of active products", async () => {
    const firstPage = Array.from({ length: 100 }, (_, i) => ({
      id: i + 1,
      name: `Producto ${i + 1}`,
      slug: `producto-${i + 1}`,
      description: "d",
      price: 0,
      currency: "CLP",
    }));
    mockFetch(200, { data: firstPage, meta: { pagination: { total: 150 } } });
    const secondPage = Array.from({ length: 50 }, (_, i) => ({
      id: 101 + i,
      name: `Producto ${101 + i}`,
      slug: `producto-${101 + i}`,
      description: "d",
      price: 0,
      currency: "CLP",
    }));
    mockFetch(200, { data: secondPage, meta: { pagination: { total: 150 } } });

    const { getAllProducts } = await import("./strapi");
    const products = await getAllProducts();

    expect(products).toHaveLength(150);
    expect(fetch).toHaveBeenCalledTimes(2);
    const secondUrl = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[1]?.[0] as string;
    expect(decodeURIComponent(secondUrl)).toMatch(/pagination\[page\]=2/);
    expect(decodeURIComponent(secondUrl)).toMatch(/pagination\[pageSize\]=100/);
  });

  it("stops after a single page when all entries fit", async () => {
    mockFetch(200, {
      data: [
        { id: 1, name: "Único", slug: "unico", description: "d", price: 0, currency: "CLP" },
      ],
      meta: { pagination: { total: 1 } },
    });

    const { getAllProducts } = await import("./strapi");
    const products = await getAllProducts();

    expect(products).toHaveLength(1);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});

describe("getProductCount", () => {
  it("returns the total from the pagination meta with a minimal payload", async () => {
    mockFetch(200, { data: [], meta: { pagination: { page: 1, pageSize: 1, pageCount: 204, total: 204 } } });

    const { getProductCount } = await import("./strapi");
    const count = await getProductCount();

    expect(count).toBe(204);
    const url = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as string;
    const decoded = decodeURIComponent(url);
    expect(decoded).toMatch(/filters\[active\]\[\$eq\]=true/);
    expect(decoded).toMatch(/fields\[0\]=documentId/);
    expect(decoded).toMatch(/pagination\[pageSize\]=1/);
  });

  it("falls back to the payload length when meta is missing", async () => {
    mockFetch(200, { data: [{ id: 1, documentId: "a" }] });

    const { getProductCount } = await import("./strapi");
    await expect(getProductCount()).resolves.toBe(1);
  });

  it("returns 0 when Strapi is unreachable", async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("ECONNREFUSED"));

    const { getProductCount } = await import("./strapi");
    await expect(getProductCount()).resolves.toBe(0);
  });
});

describe("getProductBySlug", () => {
  it("returns null when no product matches", async () => {
    mockFetch(200, { data: [] });
    const { getProductBySlug } = await import("./strapi");
    const product = await getProductBySlug("missing");
    expect(product).toBeNull();
  });

  it("returns the first matching product", async () => {
    mockFetch(200, {
      data: [
        {
          id: 1,
          name: "Sofá Oslo",
          slug: "sofa-oslo",
          description: "d",
          price: 1000000,
          currency: "CLP",
          active: true,
        },
      ],
    });
    const { getProductBySlug } = await import("./strapi");
    const product = await getProductBySlug("sofa-oslo");
    expect(product?.name).toBe("Sofá Oslo");
  });
});

describe("formatPrice", () => {
  it("formats CLP correctly", async () => {
    const { formatPrice } = await import("./strapi");
    const formatted = formatPrice({ price: 1290000, currency: "CLP" });
    expect(formatted).toContain("1.290.000");
  });
});

// Catalog-import (S4) — `normalizeProduct` must propagate every
// catalog-import attribute from the Strapi response. These tests pin
// the wire shape so a future refactor cannot silently drop a field
// and break the admin form / public SEO payload.
describe("normalizeProduct — catalog-import fields", () => {
  it("propagates the 10 S1 catalog-import fields and the 2 S2b traceability fields", async () => {
    mockFetch(200, {
      data: [
        {
          id: 1,
          name: "Silla escolar sala cuna",
          slug: "silla-escolar-sala-cuna",
          description: "Silla apilable de melamina.",
          price: 89900,
          currency: "CLP",
          externalId: "CAT-2025-001",
          productType: "Silla",
          subcategory: "Sillas y asientos",
          usageEnvironment: "Sala cuna / educación inicial",
          observableColor: "Madera natural y blanco",
          observableMaterial: "Melamina 18 mm",
          catalogPage: 2,
          confidence: "alta",
          source: "CATOLOGO PRODUCTOS- 2025.pdf, página 2",
          observation: "Color revisado visualmente.",
          importSource: "imported",
          importBatch: {
            id: 10,
            documentId: "batch-doc-1",
            fileName: "catalogo_productos_202.xlsx",
            uploadedAt: "2026-07-28T10:00:00.000Z",
          },
        },
      ],
    });
    const { getProductBySlug } = await import("./strapi");
    const product = await getProductBySlug("silla-escolar-sala-cuna");
    expect(product).not.toBeNull();
    expect(product!.externalId).toBe("CAT-2025-001");
    expect(product!.productType).toBe("Silla");
    expect(product!.subcategory).toBe("Sillas y asientos");
    expect(product!.usageEnvironment).toBe("Sala cuna / educación inicial");
    expect(product!.observableColor).toBe("Madera natural y blanco");
    expect(product!.observableMaterial).toBe("Melamina 18 mm");
    expect(product!.catalogPage).toBe(2);
    expect(product!.confidence).toBe("alta");
    expect(product!.source).toBe("CATOLOGO PRODUCTOS- 2025.pdf, página 2");
    expect(product!.observation).toBe("Color revisado visualmente.");
    expect(product!.importSource).toBe("imported");
    expect(product!.importBatch).toEqual({
      id: 10,
      documentId: "batch-doc-1",
      fileName: "catalogo_productos_202.xlsx",
      uploadedAt: "2026-07-28T10:00:00.000Z",
    });
  });

  it("coerces catalogPage from string to number", async () => {
    mockFetch(200, {
      data: [
        {
          id: 2,
          name: "Mesa escolar",
          slug: "mesa-escolar",
          description: "Mesa",
          price: 150000,
          currency: "CLP",
          catalogPage: "5",
        },
      ],
    });
    const { getProductBySlug } = await import("./strapi");
    const product = await getProductBySlug("mesa-escolar");
    expect(product!.catalogPage).toBe(5);
    expect(typeof product!.catalogPage).toBe("number");
  });

  it("drops importSource when Strapi returns an unknown enum value", async () => {
    // Strapi v5 ships the enum server-side. If someone bypasses the
    // route and writes an unknown value into the DB, normalizeProduct
    // should silently drop the field rather than carry the typo into
    // the public surface.
    mockFetch(200, {
      data: [
        {
          id: 3,
          name: "Escritorio",
          slug: "escritorio",
          description: "d",
          price: 0,
          currency: "CLP",
          importSource: "magically-migrated",
        },
      ],
    });
    const { getProductBySlug } = await import("./strapi");
    const product = await getProductBySlug("escritorio");
    expect(product!.importSource).toBeUndefined();
  });

  it("keeps importBatch null (vs undefined) when Strapi explicitly returns null", async () => {
    mockFetch(200, {
      data: [
        {
          id: 4,
          name: "Cuna",
          slug: "cuna",
          description: "d",
          price: 0,
          currency: "CLP",
          importSource: "manual",
          importBatch: null,
        },
      ],
    });
    const { getProductBySlug } = await import("./strapi");
    const product = await getProductBySlug("cuna");
    expect(product!.importSource).toBe("manual");
    expect(product!.importBatch).toBeNull();
  });

  it("keeps all catalog-import fields undefined when Strapi returns nothing", async () => {
    // Legacy products created before S1 land in Strapi without any
    // catalog-import columns. The public read helper must NOT crash
    // and must surface them as undefined so callers can branch on
    // their presence.
    mockFetch(200, {
      data: [
        {
          id: 5,
          name: "Silla Oslo",
          slug: "silla-oslo",
          description: "Silla de madera.",
          price: 199000,
          currency: "CLP",
        },
      ],
    });
    const { getProductBySlug } = await import("./strapi");
    const product = await getProductBySlug("silla-oslo");
    expect(product!.externalId).toBeUndefined();
    expect(product!.productType).toBeUndefined();
    expect(product!.subcategory).toBeUndefined();
    expect(product!.usageEnvironment).toBeUndefined();
    expect(product!.observableColor).toBeUndefined();
    expect(product!.observableMaterial).toBeUndefined();
    expect(product!.catalogPage).toBeUndefined();
    expect(product!.confidence).toBeUndefined();
    expect(product!.source).toBeUndefined();
    expect(product!.observation).toBeUndefined();
    expect(product!.importSource).toBeUndefined();
    expect(product!.importBatch).toBeUndefined();
  });

  it("drops confidence when Strapi returns an unknown enum value", async () => {
    // Future-proofs the same enum-validation that importSource
    // already has. Strapi v5 stores `confidence` as string; if the
    // schema enum is widened server-side, normalizeProduct should
    // still surface a clean `ProductConfidence | undefined`.
    mockFetch(200, {
      data: [
        {
          id: 6,
          name: "Banca",
          slug: "banca",
          description: "d",
          price: 0,
          currency: "CLP",
          confidence: "experimental-confidence",
        },
      ],
    });
    const { getProductBySlug } = await import("./strapi");
    const product = await getProductBySlug("banca");
    expect(product!.confidence).toBeUndefined();
  });
});

describe("buildWhatsAppLink", () => {
  it("strips + and encodes the message", async () => {
    const { buildWhatsAppLink } = await import("./strapi");
    const link = buildWhatsAppLink("+56912345678", "Hola, me interesa el Sofá Oslo");
    expect(link).toBe(
      "https://wa.me/56912345678?text=Hola%2C%20me%20interesa%20el%20Sof%C3%A1%20Oslo",
    );
  });
});

// ISR milestone — every cached Strapi fetch carries `next.revalidate`
// plus a domain tag so admin mutations can purge it via revalidateTag.
describe("cache tags (ISR milestone)", () => {
  const fetchInit = (callIndex = 0) =>
    (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[callIndex]?.[1] as RequestInit;

  it("tags product-list fetches with catalog", async () => {
    mockFetch(200, { data: [], meta: { pagination: { total: 0 } } });

    const { getProducts } = await import("./strapi");
    await getProducts();

    expect(fetchInit().next).toEqual({ revalidate: 60, tags: ["catalog"] });
  });

  it("tags single-product fetches with catalog", async () => {
    mockFetch(200, { data: [] });

    const { getProductBySlug } = await import("./strapi");
    await getProductBySlug("missing");

    expect(fetchInit().next).toEqual({ revalidate: 60, tags: ["catalog"] });
  });

  it("tags category fetches with catalog", async () => {
    mockFetch(200, { data: [] });

    const { getCategories } = await import("./strapi");
    await getCategories();

    expect(fetchInit().next).toEqual({ revalidate: 60, tags: ["catalog"] });
  });

  it("tags site-setting fetches with site-settings", async () => {
    mockFetch(200, { data: { siteName: "Ene Muebles" } });

    const { getSiteSettings } = await import("./strapi");
    await getSiteSettings();

    expect(fetchInit().next).toEqual({ revalidate: 60, tags: ["site-settings"] });
  });

  it("tags marketing-section fetches with sections", async () => {
    mockFetch(200, { data: null });

    const { getHeroSection } = await import("./strapi");
    await getHeroSection();

    expect(fetchInit().next).toEqual({ revalidate: 60, tags: ["sections"] });
  });
});

// ISR milestone — slot-aware media: callers can ask normalizeMedia /
// the fetchers for the smallest Strapi responsive format that fits
// their render slot; the default (no option) keeps the original url so
// heroes, product galleries and admin flows are untouched.
describe("normalizeMedia preferredFormat", () => {
  const formats = {
    thumbnail: { url: "/uploads/thumb_1.jpg" },
    small: { url: "/uploads/small_1.jpg" },
    medium: { url: "/uploads/medium_1.jpg" },
    large: { url: "/uploads/large_1.jpg" },
  };

  const PRODUCT_WITH_IMAGES = {
    id: 1,
    name: "Mesa escolar",
    slug: "mesa-escolar",
    description: "Mesa",
    price: 150000,
    currency: "CLP",
    images: [
      {
        id: 10,
        url: "/uploads/original_1.jpg",
        alternativeText: null,
        width: 2000,
        height: 1500,
        formats,
      },
    ],
  };

  it("keeps the original url when no option is passed (regression)", async () => {
    mockFetch(200, { data: [PRODUCT_WITH_IMAGES] });

    const { getProductBySlug } = await import("./strapi");
    const product = await getProductBySlug("mesa-escolar");

    expect(product?.images?.[0]?.url).toBe("http://localhost:1337/uploads/original_1.jpg");
  });

  it("uses the smallest sufficient format when preferredFormat is set", async () => {
    mockFetch(200, { data: [PRODUCT_WITH_IMAGES] });

    const { getProducts } = await import("./strapi");
    const result = await getProducts({ preferredFormat: "small" });

    expect(result.products[0].images?.[0]?.url).toBe(
      "http://localhost:1337/uploads/small_1.jpg",
    );
    // The formats map is preserved regardless of the picked url.
    expect(result.products[0].images?.[0]?.formats).toEqual(formats);
  });

  it("skips missing formats and falls upward to the next larger one", async () => {
    mockFetch(200, {
      data: [
        {
          ...PRODUCT_WITH_IMAGES,
          images: [
            {
              ...PRODUCT_WITH_IMAGES.images[0],
              formats: {
                thumbnail: { url: "/uploads/thumb_1.jpg" },
                large: { url: "/uploads/large_1.jpg" },
              },
            },
          ],
        },
      ],
    });

    const { getProducts } = await import("./strapi");
    const result = await getProducts({ preferredFormat: "small" });

    // small and medium are absent — never go smaller than requested,
    // so the first available format above is large.
    expect(result.products[0].images?.[0]?.url).toBe(
      "http://localhost:1337/uploads/large_1.jpg",
    );
  });

  it("falls back to the original when no format >= preferred exists", async () => {
    mockFetch(200, {
      data: [
        {
          ...PRODUCT_WITH_IMAGES,
          images: [
            {
              ...PRODUCT_WITH_IMAGES.images[0],
              formats: { thumbnail: { url: "/uploads/thumb_1.jpg" } },
            },
          ],
        },
      ],
    });

    const { getProducts } = await import("./strapi");
    const result = await getProducts({ preferredFormat: "medium" });

    expect(result.products[0].images?.[0]?.url).toBe(
      "http://localhost:1337/uploads/original_1.jpg",
    );
  });

  it("applies preferredFormat to category images", async () => {
    mockFetch(200, {
      data: [
        {
          id: 1,
          name: "Escolar",
          slug: "escolar",
          active: true,
          order: 0,
          image: {
            id: 5,
            url: "/uploads/cat_original.jpg",
            formats: { small: { url: "/uploads/cat_small.jpg" } },
          },
        },
      ],
    });

    const { getCategories } = await import("./strapi");
    const categories = await getCategories({ preferredFormat: "small" });

    expect(categories[0].image?.url).toBe("http://localhost:1337/uploads/cat_small.jpg");
  });
});

describe("pickMediaFormat", () => {
  it("returns the preferred format when it exists (absolute url)", async () => {
    const { pickMediaFormat } = await import("./strapi");
    const url = pickMediaFormat(
      {
        id: 1,
        url: "http://localhost:1337/uploads/original.jpg",
        formats: {
          thumbnail: { url: "/uploads/thumb.jpg" },
          small: { url: "/uploads/small.jpg" },
        },
      },
      "thumbnail",
    );
    expect(url).toBe("http://localhost:1337/uploads/thumb.jpg");
  });

  it("falls back upward when the preferred format is missing", async () => {
    const { pickMediaFormat } = await import("./strapi");
    const url = pickMediaFormat(
      {
        id: 1,
        url: "http://localhost:1337/uploads/original.jpg",
        formats: { large: { url: "/uploads/large.jpg" } },
      },
      "small",
    );
    expect(url).toBe("http://localhost:1337/uploads/large.jpg");
  });

  it("returns the original url when no format is available", async () => {
    const { pickMediaFormat } = await import("./strapi");
    const url = pickMediaFormat(
      { id: 1, url: "http://localhost:1337/uploads/original.jpg" },
      "small",
    );
    expect(url).toBe("http://localhost:1337/uploads/original.jpg");
  });

  it("returns null for null media", async () => {
    const { pickMediaFormat } = await import("./strapi");
    expect(pickMediaFormat(null, "small")).toBeNull();
    expect(pickMediaFormat(undefined, "thumbnail")).toBeNull();
  });
});
