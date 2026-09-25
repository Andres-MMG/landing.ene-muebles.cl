import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  strapiAuthFailure: vi.fn(),
  getStrapiAdminToken: vi.fn(),
  revalidateTag: vi.fn(),
}));

vi.mock("@/lib/admin/require-admin", () => ({
  requireAdmin: mocks.requireAdmin,
  strapiAuthFailure: mocks.strapiAuthFailure,
}));

vi.mock("@/lib/admin/strapi-admin", () => ({
  getStrapiAdminToken: mocks.getStrapiAdminToken,
}));

vi.mock("next/cache", () => ({
  revalidateTag: mocks.revalidateTag,
}));

const ORIGINAL_ENV = { ...process.env };

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function callPut(payload: unknown): Promise<Response> {
  const { PUT } = await import("./route");
  const request = new Request("http://localhost/api/admin/footer-block", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return PUT(request as unknown as Parameters<typeof PUT>[0]);
}

async function callGet(): Promise<Response> {
  const { GET } = await import("./route");
  return GET();
}

function sentBody(): { data?: Record<string, unknown> } {
  const init = vi.mocked(fetch).mock.calls[0]?.[1];
  return init?.body ? JSON.parse(String(init.body)) : {};
}

describe("admin footer-block proxy", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = { ...ORIGINAL_ENV, STRAPI_INTERNAL_URL: "http://localhost:1337" };
    mocks.requireAdmin.mockReset();
    mocks.requireAdmin.mockResolvedValue({ documentId: "admin-1", active: true });
    mocks.strapiAuthFailure.mockReset();
    mocks.strapiAuthFailure.mockReturnValue(
      Response.json({ error: "Token de Strapi rechazado" }, { status: 502 }),
    );
    mocks.getStrapiAdminToken.mockReset();
    mocks.getStrapiAdminToken.mockReturnValue("strapi-token");
    mocks.revalidateTag.mockReset();
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    process.env = ORIGINAL_ENV;
  });

  it.each(["GET", "PUT"])(
    "returns its own 401 when requireAdmin rejects %s",
    async (method: "GET" | "PUT") => {
      mocks.requireAdmin.mockResolvedValueOnce(null);

      const response = method === "GET" ? await callGet() : await callPut({ copyrightText: "©" });

      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({ error: "Unauthorized" });
      expect(fetch).not.toHaveBeenCalled();
    },
  );

  it.each(["GET", "PUT"])(
    "maps upstream Strapi 401 to the gateway auth failure for %s",
    async (method: "GET" | "PUT") => {
      vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(401, { error: "bad token" }));

      const response = method === "GET" ? await callGet() : await callPut({ copyrightText: "©" });

      expect(response.status).toBe(502);
      expect(mocks.strapiAuthFailure).toHaveBeenCalledOnce();
    },
  );

  it.each(["GET", "PUT"])(
    "returns explicit JSON 502 when the upstream network fails for %s",
    async (method: "GET" | "PUT") => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error("ECONNREFUSED"));

      const response = method === "GET" ? await callGet() : await callPut({ copyrightText: "©" });

      expect(response.status).toBe(502);
      expect(await response.json()).toEqual({
        error: "No se pudo conectar con el servidor de contenido.",
      });
    },
  );

  it.each(["GET", "PUT"])(
    "returns explicit JSON 502 for non-JSON upstream responses to %s",
    async (method: "GET" | "PUT") => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response("<html>error</html>", {
          status: method === "GET" ? 500 : 200,
          headers: { "Content-Type": "text/html" },
        }),
      );

      const response = method === "GET" ? await callGet() : await callPut({ copyrightText: "©" });

      expect(response.status).toBe(502);
      expect(await response.json()).toEqual({
        error: "El servidor de contenido devolvió una respuesta inválida.",
      });
      expect(mocks.revalidateTag).not.toHaveBeenCalled();
    },
  );

  it("forwards a valid GET payload and upstream status", async () => {
    const upstream = { data: { catalogHeading: "Catálogo CMS" } };
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(200, upstream));

    const response = await callGet();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(upstream);
    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:1337/api/footer-block?status=draft",
      expect.objectContaining({
        headers: { Authorization: "Bearer strapi-token" },
        cache: "no-store",
      }),
    );
  });

  it("accepts every bounded optional footer string, trims it, and forwards null clears", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(200, { data: { ok: true } }));

    const response = await callPut({
      copyrightText: "  © CMS  ",
      tagline: "  Tagline CMS  ",
      legalSnippet: null,
      productCountSuffix: "  productos CMS  ",
      catalogHeading: "  Catálogo CMS  ",
      contactHeading: "  Contacto CMS  ",
      legalHeading: "  Legal CMS  ",
      socialHeading: "  Redes CMS  ",
      catalogCtaLabel: "  Abrir CMS  ",
      officeLineLabel: "  Oficina CMS  ",
      schoolLineLabel: "  Escolar CMS  ",
      aboutLinkLabel: "  Empresa CMS  ",
      termsLinkLabel: "  Condiciones CMS  ",
      privacyLinkLabel: "  Privacidad CMS  ",
      rutLabel: "  Identificación  ",
      catalogStampLabel: "  Sello CMS  ",
      writtenBackingLabel: "  Respaldo CMS  ",
    });

    expect(response.status).toBe(200);
    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:1337/api/footer-block?status=published",
      expect.objectContaining({ method: "PUT" }),
    );
    expect(sentBody().data).toEqual({
      copyrightText: "© CMS",
      tagline: "Tagline CMS",
      legalSnippet: null,
      productCountSuffix: "productos CMS",
      catalogHeading: "Catálogo CMS",
      contactHeading: "Contacto CMS",
      legalHeading: "Legal CMS",
      socialHeading: "Redes CMS",
      catalogCtaLabel: "Abrir CMS",
      officeLineLabel: "Oficina CMS",
      schoolLineLabel: "Escolar CMS",
      aboutLinkLabel: "Empresa CMS",
      termsLinkLabel: "Condiciones CMS",
      privacyLinkLabel: "Privacidad CMS",
      rutLabel: "Identificación",
      catalogStampLabel: "Sello CMS",
      writtenBackingLabel: "Respaldo CMS",
    });
  });

  it("rejects empty copyright, over-limit strings, and unknown keys", async () => {
    expect((await callPut({ copyrightText: "   " })).status).toBe(400);
    expect((await callPut({ catalogHeading: "x".repeat(61) })).status).toBe(400);
    expect((await callPut({ invented: "value" })).status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("invalidates the sections cache only after a successful update", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse(500, { error: { message: "cms down" } }))
      .mockResolvedValueOnce(jsonResponse(200, { data: { ok: true } }));
    const { STRAPI_CACHE_TAGS } = await import("@/lib/strapi");

    const failed = await callPut({ catalogHeading: "Uno" });
    expect(failed.status).toBe(500);
    expect(mocks.revalidateTag).not.toHaveBeenCalled();

    const succeeded = await callPut({ catalogHeading: "Dos" });
    expect(succeeded.status).toBe(200);
    expect(mocks.revalidateTag).toHaveBeenCalledOnce();
    expect(mocks.revalidateTag).toHaveBeenCalledWith(STRAPI_CACHE_TAGS.sections, { expire: 0 });
  });
});
