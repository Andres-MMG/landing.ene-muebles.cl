import { describe, expect, it } from "vitest";
import { buildSubmitPayload, type CatalogPageFormValues } from "./CatalogPageForm";

const values: CatalogPageFormValues = {
  eyebrow: "  Catálogo institucional  ",
  productCountSuffix: "  productos certificados  ",
  documentationText: "  Documentación por escrito.  ",
  printCtaLabel: "  Imprimir PDF  ",
  printCoverTitle: "  Portada  ",
  printCoverBody: "  Texto de portada.  ",
  printIndexTitle: "  Índice  ",
  printCategorySubtitle: "  Mobiliario institucional  ",
  printPublishedProductsSuffix: "  productos publicados  ",
};

describe("CatalogPageForm.buildSubmitPayload", () => {
  it("builds the complete trimmed singleton payload without mutating form values", () => {
    const before = structuredClone(values);

    expect(buildSubmitPayload(values)).toEqual({
      seoTitle: null,
      seoDescription: null,
      eyebrow: "Catálogo institucional",
      productCountSuffix: "productos certificados",
      documentationText: "Documentación por escrito.",
      printCtaLabel: "Imprimir PDF",
      printCoverTitle: "Portada",
      printCoverBody: "Texto de portada.",
      printIndexTitle: "Índice",
      printCategorySubtitle: "Mobiliario institucional",
      printPublishedProductsSuffix: "productos publicados",
    });
    expect(values).toEqual(before);
  });
});
