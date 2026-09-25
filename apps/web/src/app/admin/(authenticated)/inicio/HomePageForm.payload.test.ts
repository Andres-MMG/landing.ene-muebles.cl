import { describe, expect, it } from "vitest";
import { buildSubmitPayload, type HomePageFormValues } from "./HomePageForm";

const values: HomePageFormValues = {
  catalogEyebrow: "  Líneas  ",
  catalogTitle: "  Título catálogo  ",
  catalogBody: "  Cuerpo catálogo  ",
  catalogCtaLabel: "  Ver catálogo  ",
  featuredEyebrow: "  Selección  ",
  featuredTitle: "  Título destacados  ",
  featuredBody: "  Cuerpo destacados  ",
  featuredCtaLabel: "  Ver todos  ",
};

describe("HomePageForm.buildSubmitPayload", () => {
  it("builds the complete trimmed singleton payload without mutating form values", () => {
    const before = structuredClone(values);
    expect(buildSubmitPayload(values)).toEqual({
      seoTitle: null,
      seoDescription: null,
      catalogEyebrow: "Líneas",
      catalogTitle: "Título catálogo",
      catalogBody: "Cuerpo catálogo",
      catalogCtaLabel: "Ver catálogo",
      featuredEyebrow: "Selección",
      featuredTitle: "Título destacados",
      featuredBody: "Cuerpo destacados",
      featuredCtaLabel: "Ver todos",
    });
    expect(values).toEqual(before);
  });
});
