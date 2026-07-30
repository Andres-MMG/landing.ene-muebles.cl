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
    })
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

  it("throws on 500", async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response("Server Error", {
        status: 500,
        statusText: "Internal Server Error",
      })
    );

    const { getSiteSettings } = await import("./strapi");
    await expect(getSiteSettings()).rejects.toThrow(/500/);
  });

  it("throws if siteName is missing", async () => {
    mockFetch(200, { data: { id: 1 } });

    const { getSiteSettings } = await import("./strapi");
    await expect(getSiteSettings()).rejects.toThrow(/siteName/);
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

    const url = (fetch as unknown as ReturnType<typeof vi.fn>).mock
      .calls[0]?.[0] as string;
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
    (fetch as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error("ECONNREFUSED")
    );
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

describe("buildWhatsAppLink", () => {
  it("strips + and encodes the message", async () => {
    const { buildWhatsAppLink } = await import("./strapi");
    const link = buildWhatsAppLink(
      "+56912345678",
      "Hola, me interesa el Sofá Oslo"
    );
    expect(link).toBe(
      "https://wa.me/56912345678?text=Hola%2C%20me%20interesa%20el%20Sof%C3%A1%20Oslo"
    );
  });
});
