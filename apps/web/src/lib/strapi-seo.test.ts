import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AboutSection, CatalogPage, ContactPage, HomePage, SiteSetting } from "./strapi";

const originalEnv = { ...process.env };
const response = (data: unknown) =>
  new Response(JSON.stringify({ data }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });

beforeEach(() => {
  vi.resetModules();
  process.env = {
    ...originalEnv,
    STRAPI_INTERNAL_URL: "http://localhost:1337",
    STRAPI_API_TOKEN: "token",
  };
});
afterEach(() => {
  vi.unstubAllGlobals();
  process.env = originalEnv;
});

async function load<T>(
  functionName:
    | "getSiteSettings"
    | "getHomePage"
    | "getCatalogPage"
    | "getContactPage"
    | "getAboutSection",
  data: unknown,
): Promise<T> {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(response(data)));
  const strapi = await import("./strapi");
  return strapi[functionName]() as Promise<T>;
}

const required = (fields: readonly string[]) =>
  Object.fromEntries(fields.map((field) => [field, ` ${field} body `]));

describe("independent SEO DTO normalization", () => {
  it("keeps valid Site Setting facts while dropping each malformed SEO/share field independently", async () => {
    const settings = await load<SiteSetting>("getSiteSettings", {
      siteName: " ENE CMS ",
      contactEmail: "contacto@example.cl",
      seoTitle: " ",
      seoDescription: 42,
      seoShareImageKicker: "Kicker válido",
      seoShareImageTitle: "x".repeat(121),
      seoShareImageDescription: null,
      seoShareImageFooter: "Footer válido",
      seoShareImageAlt: false,
    });
    expect(settings).toMatchObject({
      siteName: "ENE CMS",
      contactEmail: "contacto@example.cl",
      seoShareImageKicker: "Kicker válido",
      seoShareImageFooter: "Footer válido",
    });
    expect(settings.seoTitle).toBeUndefined();
    expect(settings.seoDescription).toBeUndefined();
    expect(settings.seoShareImageTitle).toBeUndefined();
    expect(settings.seoShareImageDescription).toBeUndefined();
    expect(settings.seoShareImageAlt).toBeUndefined();
  });

  it("does not discard valid Home body content when one SEO field is malformed", async () => {
    const fields = [
      "catalogEyebrow",
      "catalogTitle",
      "catalogBody",
      "catalogCtaLabel",
      "featuredEyebrow",
      "featuredTitle",
      "featuredBody",
      "featuredCtaLabel",
    ] as const;
    const page = await load<HomePage>("getHomePage", {
      ...required(fields),
      seoTitle: 7,
      seoDescription: "Descripción válida",
    });
    expect(page.catalogTitle).toBe("catalogTitle body");
    expect(page.seoTitle).toBeUndefined();
    expect(page.seoDescription).toBe("Descripción válida");
  });

  it("does not discard valid Catalog body content when one SEO field is over-limit", async () => {
    const fields = [
      "eyebrow",
      "productCountSuffix",
      "documentationText",
      "printCtaLabel",
      "printCoverTitle",
      "printCoverBody",
      "printIndexTitle",
      "printCategorySubtitle",
      "printPublishedProductsSuffix",
    ] as const;
    const page = await load<CatalogPage>("getCatalogPage", {
      ...required(fields),
      seoTitle: "Título válido",
      seoDescription: "x".repeat(161),
    });
    expect(page.eyebrow).toBe("eyebrow body");
    expect(page.seoTitle).toBe("Título válido");
    expect(page.seoDescription).toBeUndefined();
  });

  it("does not discard valid Contact body content when SEO is blank/wrong-type", async () => {
    const fields = [
      "heroEyebrow",
      "heroTitle",
      "heroBody",
      "whatsappCtaLabel",
      "emailCtaLabel",
      "alternateContactEyebrow",
      "phoneContactLabel",
      "whatsappContactLabel",
      "businessHoursLabel",
      "addressLabel",
      "formEyebrow",
      "formTitle",
      "formBody",
      "nameFieldLabel",
      "institutionFieldLabel",
      "emailFieldLabel",
      "phoneFieldLabel",
      "productFieldLabel",
      "generalInquiryLabel",
      "regionFieldLabel",
      "regionPlaceholder",
      "messageFieldLabel",
      "consentBeforeLink",
      "consentPrivacyLinkLabel",
      "consentAfterLink",
      "responseTimeText",
      "submitLabel",
    ] as const;
    const page = await load<ContactPage>("getContactPage", {
      ...required(fields),
      seoTitle: "  ",
      seoDescription: [],
    });
    expect(page.heroTitle).toBe("heroTitle body");
    expect(page.seoTitle).toBeUndefined();
    expect(page.seoDescription).toBeUndefined();
  });

  it("does not discard valid About copy when SEO is malformed", async () => {
    const page = await load<AboutSection>("getAboutSection", {
      eyebrow: " Quiénes somos ",
      seoTitle: {},
      seoDescription: "Descripción válida",
    });
    expect(page.eyebrow).toBe("Quiénes somos");
    expect(page.seoTitle).toBeUndefined();
    expect(page.seoDescription).toBe("Descripción válida");
  });
});
