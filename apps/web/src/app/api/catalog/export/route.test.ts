import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/strapi", () => ({
  getCatalogSnapshot: vi.fn(),
}));

import { getCatalogSnapshot } from "@/lib/strapi";

const mockedGetCatalogSnapshot = vi.mocked(getCatalogSnapshot);

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
  it("returns the bounded snapshot products as a downloadable JSON attachment", async () => {
    mockedGetCatalogSnapshot.mockResolvedValue({
      products: [
        { id: 1, name: "Silla escolar", slug: "silla-escolar" },
        { id: 2, name: "Mesa escolar", slug: "mesa-escolar" },
      ] as never,
      truncated: false,
      fetchedAt: "2026-08-21T00:00:00.000Z",
    });

    const res = await callGet();

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Disposition")).toBe(
      'attachment; filename="catalogo-ene-muebles.json"',
    );
    expect(res.headers.get("Content-Type")).toContain("application/json");
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    await expect(res.json()).resolves.toHaveLength(2);
  });

  it("preserves the current product payload without leaking snapshot metadata", async () => {
    mockedGetCatalogSnapshot.mockResolvedValue({
      products: [{ id: 7, name: "Producto vigente", slug: "producto-vigente" }] as never,
      truncated: true,
      fetchedAt: "2026-08-21T00:00:00.000Z",
    });

    const res = await callGet();
    const payload = await res.json();

    expect(payload).toEqual([{ id: 7, name: "Producto vigente", slug: "producto-vigente" }]);
    expect(payload).not.toHaveProperty("truncated");
    expect(payload).not.toHaveProperty("fetchedAt");
    expect(mockedGetCatalogSnapshot).toHaveBeenCalledOnce();
  });

  it("returns 502 with the fallback message when Strapi fails", async () => {
    mockedGetCatalogSnapshot.mockRejectedValue(new Error("ECONNREFUSED"));

    const res = await callGet();

    expect(res.status).toBe(502);
    await expect(res.json()).resolves.toEqual({
      error: "No se pudo generar el catálogo.",
    });
  });
});
