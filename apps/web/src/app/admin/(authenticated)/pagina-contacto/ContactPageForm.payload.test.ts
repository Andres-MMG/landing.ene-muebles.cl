import { describe, expect, it } from "vitest";
import { buildSubmitPayload, type ContactPageFormValues } from "./ContactPageForm";

const values: ContactPageFormValues = {
  heroEyebrow: "  Hablemos  ",
  heroTitle: "  Hablemos de tu proyecto.  ",
  heroBody: "  Texto principal.  ",
  whatsappCtaLabel: "  Hablar por WhatsApp  ",
  emailCtaLabel: "  Correo  ",
  alternateContactEyebrow: "  Si prefieres  ",
  phoneContactLabel: "  Teléfono  ",
  whatsappContactLabel: "  WhatsApp  ",
  businessHoursLabel: "  Horario  ",
  addressLabel: "  Dirección  ",
  formEyebrow: "  Formulario  ",
  formTitle: "  Envíanos tu requerimiento.  ",
  formBody: "  Texto de apoyo.  ",
  nameFieldLabel: "  Nombre  ",
  institutionFieldLabel: "  Institución o empresa  ",
  emailFieldLabel: "  Correo  ",
  phoneFieldLabel: "  Teléfono  ",
  productFieldLabel: "  ¿Sobre qué producto nos escribes?  ",
  generalInquiryLabel: "  Pregunta general  ",
  regionFieldLabel: "  Región  ",
  regionPlaceholder: "  Selecciona una región  ",
  messageFieldLabel: "  Cuéntanos qué necesitas  ",
  consentBeforeLink: "  Acepto la  ",
  consentPrivacyLinkLabel: "  política de privacidad  ",
  consentAfterLink: "  y autorizo el uso de mis datos.  ",
  responseTimeText: "  Respondemos en 24 h hábiles  ",
  submitLabel: "  Enviar mensaje  ",
};

describe("ContactPageForm.buildSubmitPayload", () => {
  it("builds the complete trimmed singleton payload without mutating form state", () => {
    const before = structuredClone(values);
    const payload = buildSubmitPayload(values);

    expect(Object.keys(payload)).toEqual(Object.keys(values));
    expect(Object.values(payload).every((value) => value === null || value === value.trim())).toBe(
      true,
    );
    expect(payload).toMatchObject({
      heroEyebrow: "Hablemos",
      heroTitle: "Hablemos de tu proyecto.",
      formTitle: "Envíanos tu requerimiento.",
      consentPrivacyLinkLabel: "política de privacidad",
      submitLabel: "Enviar mensaje",
    });
    expect(values).toEqual(before);
  });
});
