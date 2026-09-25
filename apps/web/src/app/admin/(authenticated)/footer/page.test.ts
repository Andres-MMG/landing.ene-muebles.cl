import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getStrapiAdminToken: vi.fn(),
}));

vi.mock("@/lib/admin/strapi-admin", () => ({
  getStrapiAdminToken: mocks.getStrapiAdminToken,
}));

const ORIGINAL_ENV = { ...process.env };

function response(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("Admin footer loader", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = { ...ORIGINAL_ENV, STRAPI_INTERNAL_URL: "http://localhost:1337" };
    mocks.getStrapiAdminToken.mockReset();
    mocks.getStrapiAdminToken.mockReturnValue(" test-token ");
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    process.env = ORIGINAL_ENV;
  });

  it.each([
    [404, { error: { message: "Not found" } }],
    [200, { data: null }],
  ])(
    "uses the exact editable fallback only for confirmed absence (%s)",
    async (status: number, body: unknown) => {
      vi.mocked(fetch).mockResolvedValueOnce(response(status, body));
      const { getFooterBlockForAdmin } = await import("./page");

      const block = await getFooterBlockForAdmin();

      expect(block).toMatchObject({
        productCountSuffix: "productos certificados para instituciones",
        catalogHeading: "Catálogo",
        contactHeading: "Contacto",
        legalHeading: "Legal",
        socialHeading: "Redes",
        catalogCtaLabel: "Ver catálogo",
        officeLineLabel: "Línea oficina",
        schoolLineLabel: "Línea escolar",
        aboutLinkLabel: "Sobre nosotros",
        termsLinkLabel: "Términos y condiciones",
        privacyLinkLabel: "Política de privacidad",
        rutLabel: "RUT",
        catalogStampLabel: "Catálogo institucional",
        writtenBackingLabel: "Respaldo escrito",
      });
    },
  );

  it("keeps a partial real CMS record primary instead of filling missing fields", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      response(200, { data: { catalogHeading: "Encabezado CMS" } }),
    );
    const { getFooterBlockForAdmin } = await import("./page");

    const block = await getFooterBlockForAdmin();

    expect(block).toEqual({ catalogHeading: "Encabezado CMS" });
    expect(block.productCountSuffix).toBeUndefined();
  });

  it("sends the trimmed admin token when configured", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(response(200, { data: null }));
    const { getFooterBlockForAdmin } = await import("./page");

    await getFooterBlockForAdmin();

    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:1337/api/footer-block?status=draft",
      expect.objectContaining({
        headers: { Authorization: "Bearer test-token" },
        cache: "no-store",
      }),
    );
  });

  it("omits the Authorization header when the admin token is blank", async () => {
    mocks.getStrapiAdminToken.mockReturnValue("   ");
    vi.mocked(fetch).mockResolvedValueOnce(response(200, { data: null }));
    const { getFooterBlockForAdmin } = await import("./page");

    await getFooterBlockForAdmin();

    const init = vi.mocked(fetch).mock.calls[0]?.[1];
    expect(init).not.toHaveProperty("headers");
  });

  it.each([401, 500])("fails closed for upstream HTTP %s", async (status: number) => {
    vi.mocked(fetch).mockResolvedValueOnce(response(status, { error: { message: "upstream" } }));
    const { getFooterBlockForAdmin } = await import("./page");

    await expect(getFooterBlockForAdmin()).rejects.toThrow(String(status));
  });

  it("fails closed for network errors", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error("ECONNREFUSED"));
    const { getFooterBlockForAdmin } = await import("./page");

    await expect(getFooterBlockForAdmin()).rejects.toThrow("ECONNREFUSED");
  });

  it.each([
    ["missing envelope", { other: null }],
    ["invalid data", { data: "wrong" }],
  ])("fails closed for malformed CMS payload: %s", async (_label: string, body: unknown) => {
    vi.mocked(fetch).mockResolvedValueOnce(response(200, body));
    const { getFooterBlockForAdmin } = await import("./page");

    await expect(getFooterBlockForAdmin()).rejects.toThrow("inválid");
  });

  it("fails closed for non-JSON CMS payloads", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response("not-json", { status: 200, headers: { "Content-Type": "text/plain" } }),
    );
    const { getFooterBlockForAdmin } = await import("./page");

    await expect(getFooterBlockForAdmin()).rejects.toThrow();
  });
});
