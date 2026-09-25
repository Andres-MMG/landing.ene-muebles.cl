import { describe, expect, it } from "vitest";
import { buildSubmitPayload, type ContactCtaSectionFormValues } from "./ContactCtaSectionForm";

describe("ContactCtaSectionForm.buildSubmitPayload", () => {
  it("trims all values and preserves the existing optional-field behavior", () => {
    const values: ContactCtaSectionFormValues = {
      eyebrow: "  Proyectos  ",
      title: "  Hablemos de tu proyecto.  ",
      body: "  Cuéntanos qué necesitas.  ",
      buttonLabel: "  Hablar por WhatsApp  ",
      buttonHref: "  https://wa.me/56912345678  ",
      emailLabel: "  Escríbenos  ",
    };
    const before = structuredClone(values);

    expect(buildSubmitPayload(values)).toEqual({
      eyebrow: "Proyectos",
      title: "Hablemos de tu proyecto.",
      body: "Cuéntanos qué necesitas.",
      buttonLabel: "Hablar por WhatsApp",
      buttonHref: "https://wa.me/56912345678",
      emailLabel: "Escríbenos",
    });
    expect(values).toEqual(before);
  });

  it("serializes blank new optional labels as null while omitting legacy optional fields", () => {
    expect(
      buildSubmitPayload({
        eyebrow: "   ",
        title: "Título",
        body: "   ",
        buttonLabel: "Botón",
        buttonHref: "",
        emailLabel: "\t",
      }),
    ).toEqual({
      eyebrow: null,
      title: "Título",
      buttonLabel: "Botón",
      emailLabel: null,
    });
  });
});
