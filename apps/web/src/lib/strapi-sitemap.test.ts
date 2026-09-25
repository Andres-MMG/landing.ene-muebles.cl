import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const originalEnv = { ...process.env };

beforeEach(() => {
  vi.resetModules();
  process.env = {
    ...originalEnv,
    STRAPI_INTERNAL_URL: "http://localhost:1337",
    STRAPI_API_TOKEN: "token",
  };
});

afterEach(() => {
  vi.unstubAllGlobals();
  process.env = originalEnv;
});

function response(data: unknown[], total?: number): Response {
  return new Response(
    JSON.stringify({
      data,
      ...(total === undefined ? {} : { meta: { pagination: { total } } }),
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    },
  );
}

describe("dedicated sitemap readers", () => {
  it("paginates through more than 200 published products without changing the print snapshot", async () => {
    const rows = Array.from({ length: 205 }, (_, index) => ({
      slug: `product-${index + 1}`,
      updatedAt: `2026-01-${String((index % 28) + 1).padStart(2, "0")}T00:00:00.000Z`,
      images: index === 0 ? [{ url: "/uploads/cover.jpg" }] : [],
    }));
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(response(rows.slice(0, 100), 205))
      .mockResolvedValueOnce(response(rows.slice(100, 200), 205))
      .mockResolvedValueOnce(response(rows.slice(200), 205));
    vi.stubGlobal("fetch", fetchMock);

    const { getSitemapProducts } = await import("./strapi");
    const products = await getSitemapProducts();

    expect(products).toHaveLength(205);
    expect(products[0]).toMatchObject({ slug: "product-1" });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    for (const call of fetchMock.mock.calls) {
      const url = decodeURIComponent(String(call[0]));
      expect(url).toContain("status=published");
      expect(url).toContain("filters[active][$eq]=true");
      expect(url).toContain("pagination[pageSize]=100");
    }
  });

  it("requests and returns more than Strapi's default 25 categories", async () => {
    const rows = Array.from({ length: 30 }, (_, index) => ({ slug: `category-${index + 1}` }));
    const fetchMock = vi.fn().mockResolvedValueOnce(response(rows, 30));
    vi.stubGlobal("fetch", fetchMock);

    const { getSitemapCategories } = await import("./strapi");
    await expect(getSitemapCategories()).resolves.toHaveLength(30);
    const url = decodeURIComponent(String(fetchMock.mock.calls[0][0]));
    expect(url).toContain("status=published");
    expect(url).toContain("pagination[pageSize]=100");
  });

  it("continues pagination without metadata until Strapi returns a short page", async () => {
    const rows = Array.from({ length: 103 }, (_, index) => ({ slug: `category-${index + 1}` }));
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(response(rows.slice(0, 100)))
      .mockResolvedValueOnce(response(rows.slice(100)));
    vi.stubGlobal("fetch", fetchMock);

    const { getSitemapCategories } = await import("./strapi");
    await expect(getSitemapCategories()).resolves.toHaveLength(103);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(decodeURIComponent(String(fetchMock.mock.calls[1][0]))).toContain("pagination[page]=2");
  });

  it("fails explicitly when Strapi reports more than the single-sitemap protocol limit", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(response([], 50_001)));

    const { getSitemapProducts } = await import("./strapi");
    await expect(getSitemapProducts()).rejects.toThrow(
      "Published product count exceeds the single-sitemap URL limit",
    );
  });

  it("fails after the bounded product page budget when full pages repeat without metadata", async () => {
    const rows = Array.from({ length: 100 }, (_, index) => ({ slug: `product-${index + 1}` }));
    const fetchMock = vi
      .fn()
      .mockImplementation(() =>
        fetchMock.mock.calls.length > 500
          ? Promise.reject(new Error("unbounded product pagination"))
          : Promise.resolve(response(rows)),
      );
    vi.stubGlobal("fetch", fetchMock);

    const { getSitemapProducts } = await import("./strapi");
    await expect(getSitemapProducts()).rejects.toThrow(
      "Published product pagination exhausted the single-sitemap URL budget",
    );
    expect(fetchMock).toHaveBeenCalledTimes(500);
  });

  it("fails after the bounded category page budget when full pages repeat without metadata", async () => {
    const rows = Array.from({ length: 100 }, (_, index) => ({ slug: `category-${index + 1}` }));
    const fetchMock = vi
      .fn()
      .mockImplementation(() =>
        fetchMock.mock.calls.length > 500
          ? Promise.reject(new Error("unbounded category pagination"))
          : Promise.resolve(response(rows)),
      );
    vi.stubGlobal("fetch", fetchMock);

    const { getSitemapCategories } = await import("./strapi");
    await expect(getSitemapCategories()).rejects.toThrow(
      "Published category pagination exhausted the single-sitemap URL budget",
    );
    expect(fetchMock).toHaveBeenCalledTimes(500);
  });
});
