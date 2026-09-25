import { describe, expect, it } from "vitest";
import schema from "./schema.json";

const OPTIONAL_COPY_FIELDS = {
  pageEyebrow: ["string", 80],
  pageTitle: ["string", 200],
  yearsInBusinessLabel: ["string", 80],
  productCountLabel: ["string", 80],
  productLineCountLabel: ["string", 80],
  coverageLabel: ["string", 80],
  warrantyLabel: ["string", 80],
  projectCtaTitle: ["string", 200],
  projectCtaBody: ["text", 600],
  projectCtaLabel: ["string", 80],
} as const;

describe("about-section schema", () => {
  it("keeps the singleton publish workflow and values JSON compatibility", () => {
    expect(schema.kind).toBe("singleType");
    expect(schema.options.draftAndPublish).toBe(true);
    expect(schema.attributes.values.type).toBe("json");
  });

  it("declares the new page copy fields as optional and bounded", () => {
    for (const [field, [type, maxLength]] of Object.entries(OPTIONAL_COPY_FIELDS)) {
      const attribute = schema.attributes[field as keyof typeof schema.attributes] as {
        type?: string;
        maxLength?: number;
        required?: boolean;
      };

      expect(attribute).toMatchObject({ type, maxLength });
      expect(attribute.required).not.toBe(true);
    }
  });
});
