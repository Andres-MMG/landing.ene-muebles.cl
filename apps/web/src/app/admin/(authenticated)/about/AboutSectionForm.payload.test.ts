import { describe, expect, it } from "vitest";
import { buildSubmitPayload } from "./AboutSectionForm";

const BASE_VALUES = {
  eyebrow: "  Datos  ",
  title: "  Tres décadas  ",
  intro: "  Introducción  ",
  body: "  Cuerpo  ",
  missionLabel: "  Misión  ",
  missionHeading: "  Encabezado misión  ",
  missionBody: "  Cuerpo misión  ",
  visionLabel: "  Visión  ",
  visionHeading: "  Encabezado visión  ",
  visionBody: "  Cuerpo visión  ",
  valuesLabel: "  Valores  ",
  valuesHeading: "  Compromisos  ",
  pageEyebrow: "  Sobre nosotros  ",
  pageTitle: "  Un proveedor confiable  ",
  yearsInBusinessLabel: "  Años en el rubro  ",
  productCountLabel: "  Productos activos  ",
  productLineCountLabel: "  Líneas activas  ",
  coverageLabel: "  Cobertura  ",
  warrantyLabel: "  Garantía  ",
  projectCtaTitle: "  ¿Listo para cotizar?  ",
  projectCtaBody: "  Envíanos tu lista.  ",
  projectCtaLabel: "  Ir a contacto  ",
  values: [
    { title: "  Cumplimiento  ", body: "  Despacho pactado.  " },
    { title: "   ", body: "   " },
  ],
};

describe("AboutSectionForm buildSubmitPayload", () => {
  it("trims new page copy while preserving the existing section and values semantics", () => {
    const input = structuredClone(BASE_VALUES);
    const payload = buildSubmitPayload(input);

    expect(payload).toMatchObject({
      eyebrow: "Datos",
      title: "Tres décadas",
      intro: "Introducción",
      body: "Cuerpo",
      pageEyebrow: "Sobre nosotros",
      pageTitle: "Un proveedor confiable",
      yearsInBusinessLabel: "Años en el rubro",
      productCountLabel: "Productos activos",
      productLineCountLabel: "Líneas activas",
      coverageLabel: "Cobertura",
      warrantyLabel: "Garantía",
      projectCtaTitle: "¿Listo para cotizar?",
      projectCtaBody: "Envíanos tu lista.",
      projectCtaLabel: "Ir a contacto",
      values: [{ title: "Cumplimiento", body: "Despacho pactado." }],
    });
    expect(input).toEqual(BASE_VALUES);
  });

  it("serializes blank new optional fields as null so saved CMS copy can be cleared", () => {
    const payload = buildSubmitPayload({
      ...structuredClone(BASE_VALUES),
      intro: "   ",
      pageEyebrow: "   ",
      pageTitle: "",
      yearsInBusinessLabel: " ",
      productCountLabel: " ",
      productLineCountLabel: " ",
      coverageLabel: " ",
      warrantyLabel: " ",
      projectCtaTitle: " ",
      projectCtaBody: " ",
      projectCtaLabel: " ",
    });

    expect(payload).not.toHaveProperty("intro");
    expect(payload).toMatchObject({
      pageEyebrow: null,
      pageTitle: null,
      yearsInBusinessLabel: null,
      productCountLabel: null,
      productLineCountLabel: null,
      coverageLabel: null,
      warrantyLabel: null,
      projectCtaTitle: null,
      projectCtaBody: null,
      projectCtaLabel: null,
    });
  });
});
