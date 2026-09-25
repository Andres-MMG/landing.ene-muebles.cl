import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
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

const mockFetch = (status: number, body: unknown) => {
  (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
};

const mockFetchError = () => {
  (fetch as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("ECONNREFUSED"));
};

describe("Batch 2 read helpers — fallback semantics", () => {
  it("getHomePage returns the exact current homepage copy when Strapi returns null", async () => {
    mockFetch(200, { data: null });
    const { getHomePage } = await import("./strapi");
    const page = await getHomePage();
    expect(page).toEqual(
      expect.objectContaining({
        catalogEyebrow: siteTokens.catalogOverview,
        catalogTitle: "El catálogo se divide en dos líneas de fabricación.",
        catalogBody:
          "Cada línea agrupa productos con la misma estructura, materiales y plazos de despacho.",
        catalogCtaLabel: siteTokens.catalogAll,
        featuredEyebrow: siteTokens.featuredOverline,
        featuredTitle: siteTokens.featuredHeading,
        featuredBody:
          "La selección activa del catálogo. Cada uno se entrega con ficha técnica y plazo de despacho.",
        featuredCtaLabel: siteTokens.catalogAll,
      }),
    );
  });

  it("getHomePage normalizes CMS data and uses the dedicated cache tag", async () => {
    mockFetch(200, {
      data: {
        catalogEyebrow: "  Catálogo institucional  ",
        catalogTitle: "  Dos líneas  ",
        catalogBody: "  Cuerpo catálogo  ",
        catalogCtaLabel: "  Ver todo  ",
        featuredEyebrow: "  Selección  ",
        featuredTitle: "  Productos activos  ",
        featuredBody: "  Cuerpo destacados  ",
        featuredCtaLabel: "  Abrir catálogo  ",
      },
    });
    const { getHomePage, STRAPI_CACHE_TAGS } = await import("./strapi");
    const page = await getHomePage();
    expect(page.catalogEyebrow).toBe("Catálogo institucional");
    expect(page.featuredCtaLabel).toBe("Abrir catálogo");
    const init = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0]?.[1] as
      | { next?: { tags?: string[] } }
      | undefined;
    expect(init?.next?.tags).toEqual([STRAPI_CACHE_TAGS.homePage]);
  });

  it("getHomePage falls back as one safe unit when CMS data is partial", async () => {
    mockFetch(200, { data: { catalogTitle: "Only one field" } });
    const { getHomePage } = await import("./strapi");
    const page = await getHomePage();
    expect(page.catalogTitle).toBe("El catálogo se divide en dos líneas de fabricación.");
    expect(page.featuredTitle).toBe(siteTokens.featuredHeading);
  });

  it("getAboutSection returns the ui-tokens fallback when Strapi returns null", async () => {
    mockFetch(200, { data: null });
    const { getAboutSection } = await import("./strapi");
    const section = await getAboutSection();
    expect(section.title).toBe(siteTokens.aboutHeading);
    expect(section.eyebrow).toBe(siteTokens.aboutOverline);
    expect(section.intro).toBe(siteTokens.aboutIntro);
    expect(section.missionHeading).toBe(siteTokens.missionHeading);
    expect(section.visionHeading).toBe(siteTokens.visionHeading);
    expect(section.pageEyebrow).toBe(siteTokens.aboutOverlineSec);
    expect(section.pageTitle).toBe(siteTokens.aboutHeadingSec);
    expect(section.yearsInBusinessLabel).toBe("Años en el rubro");
    expect(section.productCountLabel).toBe("Productos en catálogo");
    expect(section.productLineCountLabel).toBe("Líneas de producto");
    expect(section.coverageLabel).toBe("Cobertura");
    expect(section.warrantyLabel).toBe("Garantía");
    expect(section.projectCtaTitle).toBe("¿Listo para cotizar tu proyecto institucional?");
    expect(section.projectCtaBody).toBe(
      "Envíanos tu lista, región y plazos. Te respondemos con ficha técnica y propuesta en 24 h hábiles.",
    );
    expect(section.projectCtaLabel).toBe("Ir a contacto");
    expect(Array.isArray(section.values)).toBe(true);
  });

  it("getHeroSection returns the ui-tokens fallback when Strapi 404s", async () => {
    mockFetch(404, { data: null });
    const { getHeroSection } = await import("./strapi");
    const section = await getHeroSection();
    expect(section.title).toBe(siteTokens.promise);
    expect(section.primaryCtaLabel).toBe(siteTokens.catalogAll);
    expect(section.primaryCtaHref).toBe("/catalogo");
    expect(section.secondaryCtaLabel).toBe(siteTokens.quoteCta);
    expect(section.imageCaption).toBe("Catálogo 2026");
    expect(section.galleryCaption).toBe("Nuestras instalaciones");
    expect(section.railSecondaryText).toBe("Fabricación y distribución");
  });

  it("getContactCTASection returns the ui-tokens fallback on network failure", async () => {
    mockFetchError();
    const { getContactCTASection } = await import("./strapi");
    const section = await getContactCTASection();
    expect(section.title).toBe(siteTokens.contactHeading);
    expect(section.body).toBe(siteTokens.contactBody);
    expect(section.buttonLabel).toBe(siteTokens.whatsappCta);
    expect(section.eyebrow).toBe("Hablemos");
    expect(section.emailLabel).toBe("Correo");
  });

  it("getFooterBlock returns exact label fallbacks without freezing the public copyright", async () => {
    mockFetch(200, { data: null });
    const { getFooterBlock } = await import("./strapi");
    const block = await getFooterBlock();
    expect(block.copyrightText).toBeUndefined();
    expect(block.legalSnippet).toBe("Proveedor institucional · Chile");
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
  });
});

// B2 batch 2 fix: contract tests for the 200-with-empty-data and
// 200-with-partial-data paths. The public consumers always read
// `section?.X ?? site.X`, so an empty data object (`data: {}`) and a
// partial object missing required fields MUST leave the missing
// field as `undefined` in the helper output so the consumer-side
// `??` resolves to the typed fallback. Locking the contract here
// makes a regression where Strapi returns an empty object visible
// at unit time.
describe("Batch 2 read helpers — empty/partial 200 contract", () => {
  it("getAboutSection returns undefined fields for 200 with empty data so consumers fall back", async () => {
    mockFetch(200, { data: {} });
    const { getAboutSection } = await import("./strapi");
    const section = await getAboutSection();
    // Every known field is `undefined`, so `section.X ?? site.X`
    // resolves to the typed fallback.
    expect(section.eyebrow).toBeUndefined();
    expect(section.title).toBeUndefined();
    expect(section.intro).toBeUndefined();
    expect(section.missionLabel).toBeUndefined();
    expect(section.missionHeading).toBeUndefined();
    expect(section.visionLabel).toBeUndefined();
    expect(section.visionHeading).toBeUndefined();
    expect(section.valuesLabel).toBeUndefined();
    expect(section.valuesHeading).toBeUndefined();
    expect(section.pageEyebrow).toBeUndefined();
    expect(section.pageTitle).toBeUndefined();
    expect(section.yearsInBusinessLabel).toBeUndefined();
    expect(section.projectCtaTitle).toBeUndefined();
    // Simulate the consumer-side `??` resolution:
    expect(section.eyebrow ?? siteTokens.aboutOverline).toBe(siteTokens.aboutOverline);
    expect(section.title ?? siteTokens.aboutHeading).toBe(siteTokens.aboutHeading);
    expect(section.missionLabel ?? siteTokens.missionLabel).toBe(siteTokens.missionLabel);
    expect(section.missionHeading ?? siteTokens.missionHeading).toBe(siteTokens.missionHeading);
    expect(section.valuesLabel ?? siteTokens.valuesLabel).toBe(siteTokens.valuesLabel);
  });

  it("getAboutSection exposes the present fields and undefined for missing ones", async () => {
    mockFetch(200, {
      data: {
        title: "CMS title",
        missionBody: "only body",
        pageTitle: "  CMS About title  ",
        values: [{ title: "CMS value", body: "CMS value body" }],
      },
    });
    const { getAboutSection } = await import("./strapi");
    const section = await getAboutSection();
    // The CMS-supplied field wins.
    expect(section.title).toBe("CMS title");
    expect(section.missionBody).toBe("only body");
    expect(section.pageTitle).toBe("CMS About title");
    expect(section.values).toEqual([{ title: "CMS value", body: "CMS value body" }]);
    // Missing fields stay undefined so the consumer's `??` falls back.
    expect(section.eyebrow).toBeUndefined();
    expect(section.missionHeading).toBeUndefined();
    expect(section.valuesLabel).toBeUndefined();
    expect(section.pageEyebrow).toBeUndefined();
    expect(section.projectCtaLabel).toBeUndefined();
    expect(section.eyebrow ?? siteTokens.aboutOverline).toBe(siteTokens.aboutOverline);
    expect(section.missionHeading ?? siteTokens.missionHeading).toBe(siteTokens.missionHeading);
    expect(section.title ?? siteTokens.aboutHeading).toBe("CMS title");
  });

  it("getHeroSection returns undefined fields for 200 with empty data", async () => {
    mockFetch(200, { data: {} });
    const { getHeroSection } = await import("./strapi");
    const section = await getHeroSection();
    expect(section.eyebrow).toBeUndefined();
    expect(section.title).toBeUndefined();
    expect(section.primaryCtaLabel).toBeUndefined();
    expect(section.primaryCtaHref).toBeUndefined();
    expect(section.title ?? siteTokens.promise).toBe(siteTokens.promise);
    expect(section.primaryCtaLabel ?? siteTokens.catalogAll).toBe(siteTokens.catalogAll);
    expect(section.primaryCtaHref ?? "/catalogo").toBe("/catalogo");
  });

  it("getHeroSection keeps the present subtitle and undefineds the rest", async () => {
    mockFetch(200, { data: { subtitle: "Subtítulo CMS" } });
    const { getHeroSection } = await import("./strapi");
    const section = await getHeroSection();
    expect(section.subtitle).toBe("Subtítulo CMS");
    expect(section.title).toBeUndefined();
    expect(section.primaryCtaLabel).toBeUndefined();
    expect(section.subtitle).toBe("Subtítulo CMS");
    expect(section.title ?? siteTokens.promise).toBe(siteTokens.promise);
  });

  it("getContactCTASection returns undefined fields for 200 with empty data", async () => {
    mockFetch(200, { data: {} });
    const { getContactCTASection } = await import("./strapi");
    const section = await getContactCTASection();
    expect(section.title).toBeUndefined();
    expect(section.body).toBeUndefined();
    expect(section.buttonLabel).toBeUndefined();
    expect(section.eyebrow).toBeUndefined();
    expect(section.emailLabel).toBeUndefined();
    expect(section.title ?? siteTokens.contactHeading).toBe(siteTokens.contactHeading);
    expect(section.buttonLabel ?? siteTokens.whatsappCta).toBe(siteTokens.whatsappCta);
  });

  it("getContactCTASection keeps the present buttonHref and undefineds the rest", async () => {
    mockFetch(200, {
      data: { buttonHref: "https://wa.me/56912345678", eyebrow: "  Conversamos  " },
    });
    const { getContactCTASection } = await import("./strapi");
    const section = await getContactCTASection();
    expect(section.buttonHref).toBe("https://wa.me/56912345678");
    expect(section.eyebrow).toBe("Conversamos");
    expect(section.emailLabel).toBeUndefined();
    expect(section.title).toBeUndefined();
    expect(section.title ?? siteTokens.contactHeading).toBe(siteTokens.contactHeading);
  });

  it("getFooterBlock resolves exact per-field fallbacks for a legacy empty document", async () => {
    mockFetch(200, { data: {} });
    const { getFooterBlock } = await import("./strapi");
    const block = await getFooterBlock();
    expect(block.copyrightText).toBeUndefined();
    expect(block.legalSnippet).toBe("Proveedor institucional · Chile");
    expect(block.tagline).toBeUndefined();
    expect(block.catalogHeading).toBe("Catálogo");
    expect(block.writtenBackingLabel).toBe("Respaldo escrito");
  });

  it("getFooterBlock keeps valid present fields and resolves each missing or malformed field", async () => {
    mockFetch(200, {
      data: {
        tagline: "  Línea custom  ",
        catalogHeading: "  Productos CMS  ",
        contactHeading: 42,
      },
    });
    const { getFooterBlock } = await import("./strapi");
    const block = await getFooterBlock();
    expect(block.tagline).toBe("Línea custom");
    expect(block.copyrightText).toBeUndefined();
    expect(block.catalogHeading).toBe("Productos CMS");
    expect(block.contactHeading).toBe("Contacto");
    expect(block.legalSnippet).toBe("Proveedor institucional · Chile");
  });

  it("getFooterBlock preserves exact label fallbacks on network failure", async () => {
    mockFetchError();
    const { getFooterBlock } = await import("./strapi");

    await expect(getFooterBlock()).resolves.toMatchObject({
      copyrightText: undefined,
      catalogHeading: "Catálogo",
      privacyLinkLabel: "Política de privacidad",
      writtenBackingLabel: "Respaldo escrito",
    });
  });
});
