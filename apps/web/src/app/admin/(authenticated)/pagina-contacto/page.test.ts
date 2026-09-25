import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  vi.resetModules();
  process.env = {
    ...ORIGINAL_ENV,
    STRAPI_INTERNAL_URL: "http://localhost:1337",
    STRAPI_API_TOKEN: "test-token",
  };
  delete process.env.STRAPI_ADMIN_TOKEN;
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
  process.env = ORIGINAL_ENV;
});

function mockResponse(status: number, body: string) {
  vi.mocked(fetch).mockResolvedValueOnce(
    new Response(body, { status, headers: { "Content-Type": "application/json" } }),
  );
}

describe("Admin /admin/pagina-contacto data loader", () => {
  it("returns the exact public fallback only when the singleton is absent", async () => {
    mockResponse(200, JSON.stringify({ data: null }));
    const { getContactPageForAdmin } = await import("./page");

    await expect(getContactPageForAdmin()).resolves.toEqual(
      expect.objectContaining({
        heroEyebrow: "Hablemos",
        heroTitle: "Hablemos de tu proyecto.",
        formTitle: "Envíanos tu requerimiento.",
        submitLabel: "Enviar mensaje",
      }),
    );
  });

  it("uses the fallback for an explicit 404", async () => {
    mockResponse(404, JSON.stringify({ error: { message: "Not Found" } }));
    const { getContactPageForAdmin } = await import("./page");

    await expect(getContactPageForAdmin()).resolves.toEqual(
      expect.objectContaining({ heroTitle: "Hablemos de tu proyecto." }),
    );
  });

  it("keeps a partial real CMS document primary without filling missing fields", async () => {
    mockResponse(200, JSON.stringify({ data: { heroTitle: "Título CMS" } }));
    const { getContactPageForAdmin } = await import("./page");

    await expect(getContactPageForAdmin()).resolves.toEqual({ heroTitle: "Título CMS" });
  });

  it.each([
    ["non-not-found response", () => mockResponse(503, JSON.stringify({ error: "down" }))],
    ["network failure", () => vi.mocked(fetch).mockRejectedValueOnce(new Error("network"))],
    ["malformed JSON", () => mockResponse(200, "not-json")],
    ["malformed envelope", () => mockResponse(200, JSON.stringify({ value: {} }))],
  ])("fails closed for %s", async (_name: string, arrange: () => void) => {
    arrange();
    const { getContactPageForAdmin } = await import("./page");
    await expect(getContactPageForAdmin()).rejects.toThrow();
  });

  it("does not send an empty bearer header when no token is configured", async () => {
    delete process.env.STRAPI_API_TOKEN;
    delete process.env.STRAPI_ADMIN_TOKEN;
    mockResponse(200, JSON.stringify({ data: null }));
    const { getContactPageForAdmin } = await import("./page");
    await getContactPageForAdmin();

    const init = vi.mocked(fetch).mock.calls[0]?.[1] as RequestInit;
    expect(new Headers(init.headers).has("authorization")).toBe(false);
  });

  it("is linked from the authenticated admin navigation", async () => {
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const source = await fs.readFile(path.join(__dirname, "..", "layout.tsx"), "utf8");
    expect(source).toContain('href: "/admin/pagina-contacto"');
    expect(source).toContain('label: "Página contacto"');
  });
});
