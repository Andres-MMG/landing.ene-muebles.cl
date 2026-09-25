import { describe, expect, it } from "vitest";
import schema from "./schema.json";

const OPTIONAL_COPY_FIELDS = {
  productCountSuffix: 160,
  catalogHeading: 60,
  contactHeading: 60,
  legalHeading: 60,
  socialHeading: 60,
  catalogCtaLabel: 80,
  officeLineLabel: 80,
  schoolLineLabel: 80,
  aboutLinkLabel: 80,
  termsLinkLabel: 120,
  privacyLinkLabel: 120,
  rutLabel: 30,
  catalogStampLabel: 120,
  writtenBackingLabel: 120,
} as const;

describe("footer-block schema", () => {
  it("preserves the existing singleton fields and publish workflow", () => {
    expect(schema.kind).toBe("singleType");
    expect(schema.options.draftAndPublish).toBe(true);
    expect(schema.attributes.copyrightText).toMatchObject({
      type: "string",
      required: true,
      maxLength: 200,
    });
    expect(schema.attributes.tagline).toMatchObject({ type: "string", maxLength: 300 });
    expect(schema.attributes.legalSnippet).toMatchObject({ type: "string", maxLength: 300 });
  });

  it("declares every new footer copy field as an optional bounded string", () => {
    for (const [field, maxLength] of Object.entries(OPTIONAL_COPY_FIELDS)) {
      const attribute = schema.attributes[field as keyof typeof schema.attributes] as {
        type?: string;
        maxLength?: number;
        required?: boolean;
      };

      expect(attribute).toMatchObject({ type: "string", maxLength });
      expect(attribute.required).not.toBe(true);
    }
  });
});
