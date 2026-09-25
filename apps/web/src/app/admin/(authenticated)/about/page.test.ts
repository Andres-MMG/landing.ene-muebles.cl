import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { site as siteTokens } from "@ene/ui-tokens";

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

function mockFetch(status: number, body: unknown) {
  (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
}

describe("Admin /admin/about data loader", () => {
  it("uses the complete public fallback only when Strapi returns data: null", async () => {
    mockFetch(200, { data: null });

    const { getAboutSectionForAdmin } = await import("./page");
    const section = await getAboutSectionForAdmin();

    expect(section).toMatchObject({
      eyebrow: siteTokens.aboutOverline,
      title: siteTokens.aboutHeading,
      pageEyebrow: siteTokens.aboutOverlineSec,
      pageTitle: siteTokens.aboutHeadingSec,
      yearsInBusinessLabel: "Años en el rubro",
      productCountLabel: "Productos en catálogo",
      productLineCountLabel: "Líneas de producto",
      coverageLabel: "Cobertura",
      warrantyLabel: "Garantía",
      projectCtaTitle: "¿Listo para cotizar tu proyecto institucional?",
      projectCtaBody:
        "Envíanos tu lista, región y plazos. Te respondemos con ficha técnica y propuesta en 24 h hábiles.",
      projectCtaLabel: "Ir a contacto",
    });
  });

  it("uses the public fallback for an upstream 404", async () => {
    mockFetch(404, { error: { message: "Not Found" } });

    const { getAboutSectionForAdmin } = await import("./page");
    const section = await getAboutSectionForAdmin();

    expect(section.pageTitle).toBe(siteTokens.aboutHeadingSec);
  });

  it("keeps a real partial document partial instead of replacing it with fallback copy", async () => {
    mockFetch(200, { data: { pageTitle: "Título parcial del CMS" } });

    const { getAboutSectionForAdmin } = await import("./page");
    const section = await getAboutSectionForAdmin();

    expect(section).toEqual({ pageTitle: "Título parcial del CMS" });
    expect(section.eyebrow).toBeUndefined();
  });

  it("keeps an empty real object instead of treating it as an absent singleton", async () => {
    mockFetch(200, { data: {} });

    const { getAboutSectionForAdmin } = await import("./page");
    await expect(getAboutSectionForAdmin()).resolves.toEqual({});
  });

  it("omits the Authorization header when the read token is blank", async () => {
    process.env.STRAPI_API_TOKEN = "   ";
    mockFetch(200, { data: null });

    const { getAboutSectionForAdmin } = await import("./page");
    await getAboutSectionForAdmin();

    const init = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0]?.[1] as
      | RequestInit
      | undefined;
    expect(init?.headers).toBeUndefined();
  });

  it("fails closed on network failures", async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("ECONNREFUSED"));

    const { getAboutSectionForAdmin } = await import("./page");
    await expect(getAboutSectionForAdmin()).rejects.toThrow("ECONNREFUSED");
  });

  it("fails closed on non-not-found upstream failures", async () => {
    mockFetch(500, { error: { message: "cms down" } });

    const { getAboutSectionForAdmin } = await import("./page");
    await expect(getAboutSectionForAdmin()).rejects.toThrow("(500)");
  });

  it.each<[string, unknown]>([
    ["an envelope without data", { result: {} }],
    ["a non-object document", { data: "invalid" }],
  ])("fails closed when Strapi returns %s", async (_label: string, body: unknown) => {
    mockFetch(200, body);

    const { getAboutSectionForAdmin } = await import("./page");
    await expect(getAboutSectionForAdmin()).rejects.toThrow(/inválid/iu);
  });
});
