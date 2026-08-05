import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/strapi", () => ({
  getAllProducts: vi.fn(),
}));

import { getAllProducts } from "@/lib/strapi";

const mockedGetAllProducts = vi.mocked(getAllProducts);

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

const callGet = async () => {
  const { GET } = await import("./route");
  return GET();
};

describe("GET /api/catalog/export", () => {
  it("returns every product as a downloadable JSON attachment", async () => {
    mockedGetAllProducts.mockResolvedValue([
      { id: 1, name: "Silla escolar", slug: "silla-escolar" },
      { id: 2, name: "Mesa escolar", slug: "mesa-escolar" },
    ]);

    const res = await callGet();

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Disposition")).toBe(
      'attachment; filename="catalogo-ene-muebles.json"',
    );
    expect(res.headers.get("Content-Type")).toContain("application/json");
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    await expect(res.json()).resolves.toHaveLength(2);
  });

  it("returns 502 with the fallback message when Strapi fails", async () => {
    mockedGetAllProducts.mockRejectedValue(new Error("ECONNREFUSED"));

    const res = await callGet();

    expect(res.status).toBe(502);
    await expect(res.json()).resolves.toEqual({
      error: "No se pudo generar el catálogo.",
    });
  });
});
