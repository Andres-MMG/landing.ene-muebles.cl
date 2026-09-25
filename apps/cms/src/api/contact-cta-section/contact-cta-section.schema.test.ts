import { describe, expect, it } from "vitest";
import schema from "./content-types/contact-cta-section/schema.json";

describe("contact-cta-section schema", () => {
  it("keeps the new microcopy fields optional and bounded", () => {
    expect(schema.attributes.eyebrow).toEqual({ type: "string", maxLength: 80 });
    expect(schema.attributes.emailLabel).toEqual({ type: "string", maxLength: 60 });
    expect("required" in schema.attributes.eyebrow).toBe(false);
    expect("required" in schema.attributes.emailLabel).toBe(false);
  });
});
