import { describe, expect, it } from "vitest";
import schema from "./schema.json";
import paragraph from "../../../../components/legal/paragraph.json";
import section from "../../../../components/legal/section.json";
import { SCOPED_TYPES } from "../../../../index";

describe("legal page schema", () => {
  it("models one hidden Draft & Publish collection with a fixed unique code", () => {
    expect(schema.kind).toBe("collectionType");
    expect(schema.options.draftAndPublish).toBe(true);
    expect(schema.pluginOptions).toEqual({
      "content-manager": { visible: false },
      "content-type-builder": { visible: false },
    });
    expect(schema.attributes.code).toEqual({
      type: "enumeration",
      enum: ["terms", "privacy"],
      required: true,
      unique: true,
      configurable: false,
    });
    expect(SCOPED_TYPES).toContain("api::legal-page.legal-page");
  });

  it("uses explicit bounded fields and plain-text nested components", () => {
    expect(schema.attributes).toMatchObject({
      eyebrow: { type: "string", required: true, maxLength: 80 },
      title: { type: "string", required: true, maxLength: 180 },
      intro: { type: "text", required: true, maxLength: 800 },
      tocLabel: { type: "string", required: true, maxLength: 80 },
      updatedLabel: { type: "string", required: true, maxLength: 80 },
      effectiveDate: { type: "date", required: true },
      version: { type: "string", required: true, maxLength: 40 },
      sections: { type: "component", repeatable: true, required: true, component: "legal.section" },
    });
    expect(section.attributes).toEqual({
      heading: { type: "string", required: true, maxLength: 160 },
      paragraphs: {
        type: "component",
        repeatable: true,
        required: true,
        component: "legal.paragraph",
      },
    });
    expect(paragraph.attributes.text).toEqual({ type: "text", required: true, maxLength: 1200 });
    expect(JSON.stringify(schema)).not.toContain('"json"');
    expect(JSON.stringify(schema)).not.toContain("richtext");
  });
});
