import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const requireAdmin = vi.hoisted(() => vi.fn());
const strapiAuthFailure = vi.hoisted(() =>
  vi.fn(() => Response.json({ error: "Strapi authentication failed" }, { status: 502 })),
);

vi.mock("@/lib/admin/require-admin", () => ({ requireAdmin, strapiAuthFailure }));

vi.mock("@/lib/admin/strapi-admin", () => ({
  getStrapiAdminToken: vi.fn().mockReturnValue("mock-strapi-token"),
}));

vi.mock("next/cache", () => ({ revalidateTag: vi.fn() }));

const ORIGINAL_ENV = { ...process.env };

const payload = {
  catalogEyebrow: "  Líneas de producto  ",
  catalogTitle: "  El catálogo se divide en dos líneas.  ",
  catalogBody: "  Descripción del catálogo.  ",
  catalogCtaLabel: "  Ver catálogo completo  ",
  featuredEyebrow: "  Selección  ",
  featuredTitle: "  Productos activos.  ",
  featuredBody: "  Descripción de destacados.  ",
  featuredCtaLabel: "  Ver catálogo completo  ",
};

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  requireAdmin.mockResolvedValue({ documentId: "admin-1", active: true });
  process.env = { ...ORIGINAL_ENV, STRAPI_INTERNAL_URL: "http://localhost:1337" };
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
  process.env = ORIGINAL_ENV;
});

function mockFetch(status: number, body: unknown) {
  (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
}

async function callPut(body: unknown) {
  const { PUT } = await import("./route");
  const request = new Request("http://localhost/api/admin/home-page", {
    method: "PUT",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
  return PUT(request as unknown as Parameters<typeof PUT>[0]);
}

describe("GET /api/admin/home-page", () => {
  it("allows an active admin to read the draft singleton", async () => {
    mockFetch(200, { data: payload });
    const { GET } = await import("./route");
    const response = await GET();

    expect(response.status).toBe(200);
    expect(requireAdmin).toHaveBeenCalledOnce();
    expect(String((fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0]?.[0])).toBe(
      "http://localhost:1337/api/home-page?status=draft",
    );
  });

  it("returns 401 without contacting Strapi when the admin is inactive or revoked", async () => {
    requireAdmin.mockResolvedValueOnce(null);
    const { GET } = await import("./route");
    const response = await GET();

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("maps an upstream 401 through the shared Strapi authentication failure", async () => {
    mockFetch(401, { error: { message: "Unauthorized" } });
    const { GET } = await import("./route");
    const response = await GET();

    expect(response.status).toBe(502);
    expect(strapiAuthFailure).toHaveBeenCalledOnce();
  });

  it("fails closed on network failures and malformed successful responses", async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("offline"));
    const { GET } = await import("./route");
    const unavailable = await GET();
    expect(unavailable.status).toBe(502);
    await expect(unavailable.json()).resolves.toEqual({
      error: "No se pudo conectar con el servidor de contenido.",
    });

    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response("not-json", { status: 200 }),
    );
    const malformed = await GET();
    expect(malformed.status).toBe(502);
    await expect(malformed.json()).resolves.toEqual({
      error: "El servidor de contenido devolvió una respuesta inválida.",
    });
  });
});

describe("PUT /api/admin/home-page", () => {
  it("validates the complete typed payload and forwards trimmed fields to the published singleton", async () => {
    mockFetch(200, { data: { ok: true } });
    const response = await callPut(payload);

    expect(response.status).toBe(200);
    expect(requireAdmin).toHaveBeenCalledOnce();
    expect(String((fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0]?.[0])).toBe(
      "http://localhost:1337/api/home-page?status=published",
    );
    const init = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0]?.[1] as RequestInit;
    expect(JSON.parse(String(init.body))).toEqual({
      data: {
        catalogEyebrow: "Líneas de producto",
        catalogTitle: "El catálogo se divide en dos líneas.",
        catalogBody: "Descripción del catálogo.",
        catalogCtaLabel: "Ver catálogo completo",
        featuredEyebrow: "Selección",
        featuredTitle: "Productos activos.",
        featuredBody: "Descripción de destacados.",
        featuredCtaLabel: "Ver catálogo completo",
      },
    });
  });

  it("returns 401 without validating or contacting Strapi when the admin is inactive or revoked", async () => {
    requireAdmin.mockResolvedValueOnce(null);
    const response = await callPut(payload);

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("rejects an incomplete or blank payload before contacting Strapi", async () => {
    const response = await callPut({ ...payload, catalogTitle: "   ", featuredBody: undefined });
    expect(response.status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("invalidates only the homepage tag after a successful JSON write", async () => {
    mockFetch(200, { data: { ok: true } });
    await callPut(payload);
    const cache = await import("next/cache");
    const { STRAPI_CACHE_TAGS } = await import("@/lib/strapi");
    expect(cache.revalidateTag).toHaveBeenCalledWith(STRAPI_CACHE_TAGS.homePage, { expire: 0 });
  });

  it("does not invalidate the homepage tag after a failed write", async () => {
    mockFetch(400, { error: { message: "invalid" } });
    await callPut(payload);
    const cache = await import("next/cache");
    expect(cache.revalidateTag).not.toHaveBeenCalled();
  });

  it("maps an upstream write 401 and does not invalidate", async () => {
    mockFetch(401, { error: { message: "Unauthorized" } });
    const response = await callPut(payload);

    expect(response.status).toBe(502);
    expect(strapiAuthFailure).toHaveBeenCalledOnce();
    const cache = await import("next/cache");
    expect(cache.revalidateTag).not.toHaveBeenCalled();
  });

  it("fails closed on a write network rejection and does not invalidate", async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("offline"));
    const response = await callPut(payload);

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({
      error: "No se pudo conectar con el servidor de contenido.",
    });
    const cache = await import("next/cache");
    expect(cache.revalidateTag).not.toHaveBeenCalled();
  });

  it("fails closed and does not invalidate after a malformed successful write", async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response("not-json", { status: 200 }),
    );
    const response = await callPut(payload);

    expect(response.status).toBe(502);
    const cache = await import("next/cache");
    expect(cache.revalidateTag).not.toHaveBeenCalled();
  });
});
