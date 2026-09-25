import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  vi.resetModules();
  process.env = { ...ORIGINAL_ENV, STRAPI_INTERNAL_URL: "http://localhost:1337" };
  delete process.env.STRAPI_API_TOKEN;
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
  process.env = ORIGINAL_ENV;
});

describe("Admin /admin/pagina-catalogo data loader", () => {
  it("shows the exact public fallback when the singleton does not exist", async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response(JSON.stringify({ data: null }), { status: 200 }),
    );

    const { getCatalogPageForAdmin } = await import("./page");
    const page = await getCatalogPageForAdmin();

    expect(page.eyebrow).toBe("Catálogo institucional");
    expect(page.productCountSuffix).toBe("productos certificados para instituciones.");
    expect(page.printCoverTitle).toBe("Mobiliario institucional");
    expect(page.printIndexTitle).toBe("Líneas de producto");
  });

  it("shows the exact public fallback for an explicit Strapi not-found response", async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response(JSON.stringify({ error: { message: "Not Found" } }), { status: 404 }),
    );

    const { getCatalogPageForAdmin } = await import("./page");
    const page = await getCatalogPageForAdmin();

    expect(page.eyebrow).toBe("Catálogo institucional");
    expect(page.printCoverTitle).toBe("Mobiliario institucional");
  });

  it("keeps a real CMS document as the primary value without filling it", async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response(JSON.stringify({ data: { printCoverTitle: "Portada CMS" } }), { status: 200 }),
    );

    const { getCatalogPageForAdmin } = await import("./page");
    const page = await getCatalogPageForAdmin();

    expect(page.printCoverTitle).toBe("Portada CMS");
    expect(page.eyebrow).toBeUndefined();
  });

  it("fails closed when Strapi returns a non-not-found error", async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response(JSON.stringify({ error: { message: "Unavailable" } }), { status: 503 }),
    );

    const { getCatalogPageForAdmin } = await import("./page");

    await expect(getCatalogPageForAdmin()).rejects.toThrow();
  });

  it("fails closed when the Strapi request fails", async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error("network unavailable"),
    );

    const { getCatalogPageForAdmin } = await import("./page");

    await expect(getCatalogPageForAdmin()).rejects.toThrow("network unavailable");
  });

  it("fails closed when Strapi returns malformed JSON", async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response("not-json", { status: 200 }),
    );

    const { getCatalogPageForAdmin } = await import("./page");

    await expect(getCatalogPageForAdmin()).rejects.toThrow();
  });

  it("omits the Authorization header when STRAPI_API_TOKEN is absent", async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response(JSON.stringify({ data: null }), { status: 200 }),
    );

    const { getCatalogPageForAdmin } = await import("./page");
    await getCatalogPageForAdmin();

    const init = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0]?.[1] as RequestInit;
    expect(new Headers(init.headers).has("authorization")).toBe(false);
  });
});
