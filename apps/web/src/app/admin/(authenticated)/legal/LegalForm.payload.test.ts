import { describe, expect, it } from "vitest";
import { buildLegalPayload, type LegalFormValues } from "./LegalForm";

describe("buildLegalPayload", () => {
  it("trims legal copy, preserves cardinality, and never sends code or component ids", () => {
    const values: LegalFormValues = {
      eyebrow: " Legal ",
      title: " Privacy ",
      intro: " Intro ",
      tocLabel: " Content ",
      updatedLabel: " Updated ",
      effectiveDate: "2026-01-01",
      version: "2026-02",
      updatedAt: "2026-01-02T00:00:00.000Z",
      sections: [{ heading: " Heading ", paragraphs: [{ text: " Paragraph " }] }],
    };
    const payload = buildLegalPayload(values);
    expect(payload).toEqual({
      metadataTitle: null,
      metadataDescription: null,
      eyebrow: "Legal",
      title: "Privacy",
      intro: "Intro",
      tocLabel: "Content",
      updatedLabel: "Updated",
      effectiveDate: "2026-01-01",
      version: "2026-02",
      expectedUpdatedAt: values.updatedAt,
      sections: [{ heading: "Heading", paragraphs: [{ text: "Paragraph" }] }],
    });
    expect(payload).not.toHaveProperty("code");
    expect(JSON.stringify(payload)).not.toContain('"id"');
  });
});
