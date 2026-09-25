import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_ENV = { ...process.env };

const currentContactPage = {
  heroEyebrow: "Hablemos",
  heroTitle: "Hablemos de tu proyecto.",
  heroBody:
    "Ponte en contacto con nosotros. Cotizamos tu pedido en 24 horas hábiles, con ficha técnica, declaración de materiales y plazo de despacho por escrito.",
  whatsappCtaLabel: "Hablar por WhatsApp",
  emailCtaLabel: "Correo",
  alternateContactEyebrow: "Si prefieres",
  phoneContactLabel: "Teléfono",
  whatsappContactLabel: "WhatsApp",
  businessHoursLabel: "Horario",
  addressLabel: "Dirección",
  formEyebrow: "Formulario",
  formTitle: "Envíanos tu requerimiento.",
  formBody:
    "También puede escribirnos directamente a contacto@ene-muebles.cl o llamarnos al +569 9539 5339.",
  nameFieldLabel: "Nombre",
  institutionFieldLabel: "Institución o empresa",
  emailFieldLabel: "Correo",
  phoneFieldLabel: "Teléfono",
  productFieldLabel: "¿Sobre qué producto nos escribes?",
  generalInquiryLabel: "Pregunta general",
  regionFieldLabel: "Región",
  regionPlaceholder: "Selecciona una región",
  messageFieldLabel: "Cuéntanos qué necesitas",
  consentBeforeLink: "Acepto la",
  consentPrivacyLinkLabel: "política de privacidad",
  consentAfterLink: "y autorizo el uso de mis datos para recibir la cotización solicitada.",
  responseTimeText: "Respondemos en 24 h hábiles",
  submitLabel: "Enviar mensaje",
} as const;

beforeEach(() => {
  vi.resetModules();
  process.env = {
    ...ORIGINAL_ENV,
    STRAPI_INTERNAL_URL: "http://localhost:1337",
    STRAPI_API_TOKEN: "public-token",
  };
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
  process.env = ORIGINAL_ENV;
});

function mockJson(body: unknown, status = 200) {
  vi.mocked(fetch).mockResolvedValueOnce(
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
}

describe("getContactPage", () => {
  it("returns the exact current visible copy when the singleton is absent", async () => {
    mockJson({ data: null });
    const { getContactPage } = await import("./strapi");

    await expect(getContactPage()).resolves.toEqual(currentContactPage);
  });

  it("normalizes a complete CMS record and uses the dedicated cache tag", async () => {
    const cms = Object.fromEntries(
      Object.entries(currentContactPage).map(([key, value]) => [key, `  ${value}  `]),
    );
    mockJson({ data: { id: 4, documentId: "contact-page-1", ...cms } });
    const { getContactPage, STRAPI_CACHE_TAGS } = await import("./strapi");

    await expect(getContactPage()).resolves.toEqual({
      id: 4,
      documentId: "contact-page-1",
      ...currentContactPage,
    });
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/contact-page"),
      expect.objectContaining({
        next: expect.objectContaining({ tags: [STRAPI_CACHE_TAGS.contactPage] }),
      }),
    );
  });

  it.each([
    ["partial", { ...currentContactPage, formTitle: undefined }],
    ["malformed", { ...currentContactPage, submitLabel: 42 }],
  ])(
    "falls back atomically for a %s CMS record",
    async (_name: string, data: Record<string, unknown>) => {
      mockJson({ data });
      const { getContactPage } = await import("./strapi");

      await expect(getContactPage()).resolves.toEqual(currentContactPage);
    },
  );
});
