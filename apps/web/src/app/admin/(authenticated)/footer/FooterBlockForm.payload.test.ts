import { describe, expect, it } from "vitest";
import { buildSubmitPayload, type FooterBlockFormValues } from "./FooterBlockForm";

function values(overrides: Partial<FooterBlockFormValues> = {}): FooterBlockFormValues {
  return {
    copyrightText: "© Texto",
    tagline: "Frase de apoyo",
    legalSnippet: "Texto legal",
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
    ...overrides,
  };
}

describe("FooterBlockForm payload", () => {
  it("trims every field and preserves all editable footer keys", () => {
    const input = values({
      copyrightText: "  © Texto CMS  ",
      productCountSuffix: "  productos CMS  ",
      catalogHeading: "  Catálogo CMS  ",
      socialHeading: "  Redes CMS  ",
    });

    expect(buildSubmitPayload(input)).toMatchObject({
      copyrightText: "© Texto CMS",
      productCountSuffix: "productos CMS",
      catalogHeading: "Catálogo CMS",
      socialHeading: "Redes CMS",
      writtenBackingLabel: "Respaldo escrito",
    });
  });

  it("sends null for blank optional fields so saved overrides can be cleared", () => {
    const payload = buildSubmitPayload(
      values({
        tagline: " ",
        legalSnippet: "\n",
        productCountSuffix: "\t",
        privacyLinkLabel: " ",
      }),
    );

    expect(payload.tagline).toBeNull();
    expect(payload.legalSnippet).toBeNull();
    expect(payload.productCountSuffix).toBeNull();
    expect(payload.privacyLinkLabel).toBeNull();
  });

  it("does not mutate the form state while serializing", () => {
    const input = values({ copyrightText: "  © Original  ", catalogHeading: "  Catálogo  " });
    const snapshot = structuredClone(input);

    buildSubmitPayload(input);

    expect(input).toEqual(snapshot);
  });
});
