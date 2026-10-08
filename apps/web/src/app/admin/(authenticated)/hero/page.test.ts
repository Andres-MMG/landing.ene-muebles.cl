import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { site as siteTokens } from "@ene/ui-tokens";

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  vi.resetModules();
  process.env = { ...ORIGINAL_ENV };
  process.env.STRAPI_INTERNAL_URL = "http://localhost:1337";
  delete process.env.STRAPI_ADMIN_TOKEN;
  process.env.STRAPI_API_TOKEN = "test-token";
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
  process.env = ORIGINAL_ENV;
});

const mockFetch = (status: number, body: unknown) => {
  (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
};

describe("Admin /admin/hero data-loader — fallback contract", () => {
  it("returns the ui-tokens fallback when Strapi responds with data: null", async () => {
    mockFetch(200, { data: null });
    const { getHeroSection } = await import("./page");
    const section = await getHeroSection();
    expect(section.title).toBe(siteTokens.promise);
    expect(section.eyebrow).toBe(`${siteTokens.brand} · Proveedor institucional`);
    expect(section.primaryCtaLabel).toBe(siteTokens.catalogAll);
    expect(section.primaryCtaHref).toBe("/catalogo");
    expect(section.secondaryCtaLabel).toBe(siteTokens.quoteCta);
    expect(section.secondaryCtaHref).toBe("#contacto");
    expect(section.imageCaption).toBe("Catálogo 2026");
    expect(section.galleryCaption).toBe("Nuestras instalaciones");
    expect(section.railSecondaryText).toBe("Fabricación y distribución");
  });

  it("preserves the legacy fallback for an empty singleton object", async () => {
    mockFetch(200, { data: {} });
    const { getHeroSection } = await import("./page");
    const section = await getHeroSection();

    expect(section.title).toBe(siteTokens.promise);
    expect(section.primaryCtaLabel).toBe(siteTokens.catalogAll);
  });

  it("returns the ui-tokens fallback for an explicit not-found response", async () => {
    mockFetch(404, { error: "Not Found" });
    const { getHeroSection } = await import("./page");
    const section = await getHeroSection();

    expect(section.title).toBe(siteTokens.promise);
    expect(section.primaryCtaLabel).toBe(siteTokens.catalogAll);
  });

  it.each([401, 403, 500])(
    "fails closed when Strapi responds with HTTP %s",
    async (status: number) => {
      mockFetch(status, { error: "upstream failure" });
      const { getHeroSection } = await import("./page");

      await expect(getHeroSection()).rejects.toThrow(String(status));
    },
  );

  it("fails closed when the upstream fetch throws", async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("ECONNREFUSED"));
    const { getHeroSection } = await import("./page");

    await expect(getHeroSection()).rejects.toThrow("ECONNREFUSED");
  });

  it("fails closed when Strapi returns malformed JSON", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response("not-json", { status: 200 }));
    const { getHeroSection } = await import("./page");

    await expect(getHeroSection()).rejects.toThrow();
  });

  it.each([
    ["an envelope without data", {}],
    ["array data", { data: [] }],
    ["string data", { data: "invalid" }],
  ])("fails closed for %s", async (_label: string, body: unknown) => {
    mockFetch(200, body);
    const { getHeroSection } = await import("./page");

    await expect(getHeroSection()).rejects.toThrow("inválid");
  });

  it("returns the Strapi-supplied values verbatim when the singleton is seeded", async () => {
    mockFetch(200, {
      data: {
        eyebrow: "CMS eyebrow",
        title: "CMS title",
        subtitle: "CMS subtitle",
        primaryCtaLabel: "Ver",
        primaryCtaHref: "/catalogo",
        secondaryCtaLabel: "COTIZAR",
        secondaryCtaHref: "#contacto",
        imageCaption: "CMS image caption",
        galleryCaption: "CMS gallery caption",
        railSecondaryText: "CMS rail text",
      },
    });
    const { getHeroSection } = await import("./page");
    const section = await getHeroSection();
    expect(section.eyebrow).toBe("CMS eyebrow");
    expect(section.title).toBe("CMS title");
    expect(section.subtitle).toBe("CMS subtitle");
    expect(section.primaryCtaLabel).toBe("Ver");
    expect(section.primaryCtaHref).toBe("/catalogo");
    expect(section.secondaryCtaLabel).toBe("COTIZAR");
    expect(section.secondaryCtaHref).toBe("#contacto");
    expect(section.imageCaption).toBe("CMS image caption");
    expect(section.galleryCaption).toBe("CMS gallery caption");
    expect(section.railSecondaryText).toBe("CMS rail text");
  });

  it("keeps Strapi-supplied fields verbatim (partial payload contract)", async () => {
    // Strapi v5 returns only the fields that have been saved; the rest
    // are absent (not null, not empty string). The data-loader must
    // return the upstream object verbatim so the admin form shows the
    // saved value where Strapi provided one AND a blank input where
    // Strapi did not. The form is the layer that decides how to render
    // missing fields (today: blank input). The fallback contract only
    // applies when the upstream payload is null/empty — never as a
    // partial-payload merge.
    mockFetch(200, { data: { title: "CMS title only" } });
    const { getHeroSection } = await import("./page");
    const section = await getHeroSection();
    expect(section.title).toBe("CMS title only");
    // Missing fields stay undefined so the form's `?? ''` renders blank.
    expect(section.eyebrow).toBeUndefined();
    expect(section.primaryCtaLabel).toBeUndefined();
  });
});
