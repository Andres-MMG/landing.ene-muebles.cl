import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { buildSubmitPayload, HeroSectionForm, type Values } from "./HeroSectionForm";

const values: Values = {
  eyebrow: "  ENE  ",
  title: "  Mobiliario  ",
  subtitle: "  Bajada  ",
  primaryCtaLabel: "  Ver catálogo  ",
  primaryCtaHref: "  /catalogo  ",
  secondaryCtaLabel: "",
  secondaryCtaHref: "",
  imageCaption: "  Catálogo 2026  ",
  galleryCaption: "  Nuestras instalaciones  ",
  railSecondaryText: "  Fabricación y distribución  ",
};

describe("HeroSectionForm.buildSubmitPayload", () => {
  it("trims and sends all hero-owned editorial copy", () => {
    expect(buildSubmitPayload(values)).toEqual({
      eyebrow: "ENE",
      title: "Mobiliario",
      subtitle: "Bajada",
      primaryCtaLabel: "Ver catálogo",
      primaryCtaHref: "/catalogo",
      secondaryCtaLabel: null,
      secondaryCtaHref: null,
      imageCaption: "Catálogo 2026",
      galleryCaption: "Nuestras instalaciones",
      railSecondaryText: "Fabricación y distribución",
    });
  });

  it("sends null when an optional caption is cleared", () => {
    expect(
      buildSubmitPayload({
        ...values,
        imageCaption: " ",
        galleryCaption: "",
        railSecondaryText: "",
      }),
    ).toEqual(
      expect.objectContaining({
        imageCaption: null,
        galleryCaption: null,
        railSecondaryText: null,
      }),
    );
  });
});

describe("HeroSectionForm", () => {
  it("renders controls for all hero-owned captions", () => {
    const html = renderToStaticMarkup(createElement(HeroSectionForm, { initial: values }));

    expect(html).toContain("Pie de imagen principal");
    expect(html).toContain("Pie de imagen de instalaciones");
    expect(html).toContain("Texto secundario de la franja");
  });
});
