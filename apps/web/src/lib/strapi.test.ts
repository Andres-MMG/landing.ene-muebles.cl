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
    await getProducts("living");

    const url = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as string;
    const decoded = decodeURIComponent(url);
    expect(decoded).toMatch(/filters\[category\]\[slug\]\[\$eq\]=living/);
    expect(decoded).toMatch(/filters\[active\]\[\$eq\]=true/);
    expect(decoded).toMatch(/sort=order/);
  });

  it("returns an empty array when no products exist", async () => {
    mockFetch(200, { data: [] });
    const { getProducts } = await import("./strapi");
    const products = await getProducts();
    expect(products).toEqual([]);
  });

  it("throws on network error", async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("ECONNREFUSED"));
    const { getProducts } = await import("./strapi");
    await expect(getProducts("test")).rejects.toThrow(/Network error/);
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
