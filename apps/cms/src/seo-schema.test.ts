import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

type Attribute = { type?: string; maxLength?: number; required?: boolean };
type Schema = { attributes: Record<string, Attribute> };

function schema(api: string): Schema {
  const url = new URL(`./api/${api}/content-types/${api}/schema.json`, import.meta.url);
  return JSON.parse(readFileSync(url, "utf8")) as Schema;
}

function expectOptionalBounded(attribute: Attribute, type: string, maxLength: number) {
  expect(attribute).toMatchObject({ type, maxLength });
  expect(attribute.required).not.toBe(true);
}

describe("WU4C SEO CMS ownership", () => {
  it.each(["home-page", "catalog-page", "about-section", "contact-page"])(
    "%s owns optional bounded SEO copy",
    (api) => {
      const attributes = schema(api).attributes;
      expectOptionalBounded(attributes.seoTitle, "string", 60);
      expectOptionalBounded(attributes.seoDescription, "text", 160);
    },
  );

  it("legal-page owns metadata fields with the parent contract names", () => {
    const attributes = schema("legal-page").attributes;
    expectOptionalBounded(attributes.metadataTitle, "string", 60);
    expectOptionalBounded(attributes.metadataDescription, "text", 160);
  });

  it("does not seed or backfill optional SEO values in the CMS bootstrap", () => {
    const bootstrap = readFileSync(new URL("./index.ts", import.meta.url), "utf8");
    for (const field of [
      "seoTitle",
      "seoDescription",
      "metadataTitle",
      "metadataDescription",
      "seoShareImageKicker",
      "seoShareImageTitle",
      "seoShareImageDescription",
      "seoShareImageFooter",
      "seoShareImageAlt",
    ]) {
      expect(bootstrap).not.toContain(field);
    }
  });

  it("site-setting owns only the proven global SEO/share copy fields", () => {
    const attributes = schema("site-setting").attributes;
    expectOptionalBounded(attributes.seoTitle, "string", 60);
    expectOptionalBounded(attributes.seoDescription, "text", 160);
    expectOptionalBounded(attributes.seoShareImageKicker, "string", 100);
    expectOptionalBounded(attributes.seoShareImageTitle, "string", 120);
    expectOptionalBounded(attributes.seoShareImageDescription, "text", 200);
    expectOptionalBounded(attributes.seoShareImageFooter, "string", 160);
    expectOptionalBounded(attributes.seoShareImageAlt, "text", 200);
    expect(attributes).not.toHaveProperty("seo");
  });
});
