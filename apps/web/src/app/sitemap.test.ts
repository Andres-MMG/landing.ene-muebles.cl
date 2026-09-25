import { beforeEach, describe, expect, it, vi } from "vitest";

const getSitemapProducts = vi.hoisted(() => vi.fn());
const getSitemapCategories = vi.hoisted(() => vi.fn());
const getLegalPage = vi.hoisted(() => vi.fn());

vi.mock("@/lib/strapi", () => ({
  getSitemapProducts,
  getSitemapCategories,
  SINGLE_SITEMAP_URL_LIMIT: 50_000,
}));
vi.mock("@/lib/legal-pages", () => ({ getLegalPage }));

import sitemap, { validSitemapDate } from "./sitemap";

beforeEach(() => {
  vi.clearAllMocks();
  getSitemapCategories.mockResolvedValue([{ slug: "escolar" }]);
  getSitemapProducts.mockResolvedValue([
    {
      slug: "one",
      updatedAt: "invalid",
      publishedAt: "2026-02-03T00:00:00.000Z",
      createdAt: "2025-01-01T00:00:00.000Z",
      images: [{ url: "/uploads/one.jpg" }],
    },
    { slug: "two", updatedAt: "", publishedAt: null, createdAt: undefined, images: [] },
  ]);
  getLegalPage.mockImplementation(async (kind: string) =>
    kind === "terms"
      ? { source: "cms", updatedAt: "2026-03-04T00:00:00.000Z" }
      : { source: "fallback", updatedAt: "2026-03-05T00:00:00.000Z" },
  );
});

describe("sitemap", () => {
  it("omits fabricated freshness and uses only trustworthy timestamps", async () => {
    const entries = await sitemap();
    const home = entries.find((entry) => entry.url === "https://ene-muebles.cl");
    const category = entries.find((entry) => entry.url.endsWith("/categoria/escolar"));
    const terms = entries.find((entry) => entry.url.endsWith("/terminos"));
    const privacy = entries.find((entry) => entry.url.endsWith("/privacidad"));
    const one = entries.find((entry) => entry.url.endsWith("/producto/one"));
    const two = entries.find((entry) => entry.url.endsWith("/producto/two"));

    expect(home).not.toHaveProperty("lastModified");
    expect(category).not.toHaveProperty("lastModified");
    expect(terms?.lastModified).toEqual(new Date("2026-03-04T00:00:00.000Z"));
    expect(privacy).not.toHaveProperty("lastModified");
    expect(one?.lastModified).toEqual(new Date("2026-02-03T00:00:00.000Z"));
    expect(two).not.toHaveProperty("lastModified");
    expect(one?.images).toEqual(["https://ene-muebles.cl/uploads/one.jpg"]);
  });

  it("guards invalid dates", () => {
    expect(validSitemapDate("not-a-date")).toBeUndefined();
    expect(validSitemapDate(null)).toBeUndefined();
  });

  it("allows exactly 50,000 URLs and rejects the first URL above the protocol limit", async () => {
    getSitemapCategories.mockResolvedValue([]);
    const products = Array.from({ length: 49_995 }, (_, index) => ({
      slug: `product-${index + 1}`,
      images: [],
    }));

    getSitemapProducts.mockResolvedValueOnce(products.slice(0, 49_994));
    await expect(sitemap()).resolves.toHaveLength(50_000);

    getSitemapProducts.mockResolvedValueOnce(products);
    await expect(sitemap()).rejects.toThrow(
      "Sitemap contains 50001 URLs; split it before exceeding the 50000-URL protocol limit",
    );
  });
});
