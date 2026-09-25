import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getContactPage: vi.fn(),
  getContactProductBySlug: vi.fn(),
  getContactProductOptions: vi.fn(),
  getSiteSettings: vi.fn(),
}));

vi.mock("@/lib/strapi", () => mocks);
vi.mock("@/lib/legal-pages", () => ({ getLegalPage: vi.fn(async () => ({ version: "2026-02" })) }));

const cmsCopy = {
  heroEyebrow: "Hero CMS",
  heroTitle: "Título CMS",
  heroBody: "Cuerpo CMS",
  whatsappCtaLabel: "WhatsApp CMS",
  emailCtaLabel: "Email CMS",
  alternateContactEyebrow: "Alternativas CMS",
  phoneContactLabel: "Fono CMS",
  whatsappContactLabel: "Canal CMS",
  businessHoursLabel: "Horas CMS",
  addressLabel: "Ubicación CMS",
  formEyebrow: "Formulario CMS",
  formTitle: "Título formulario CMS",
  formBody: "Apoyo formulario CMS",
  nameFieldLabel: "Nombre CMS",
  institutionFieldLabel: "Institución CMS",
  emailFieldLabel: "Correo CMS",
  phoneFieldLabel: "Teléfono CMS",
  productFieldLabel: "Producto CMS",
  generalInquiryLabel: "Consulta CMS",
  regionFieldLabel: "Región CMS",
  regionPlaceholder: "Selecciona CMS",
  messageFieldLabel: "Mensaje CMS",
  consentBeforeLink: "Aceptación CMS",
  consentPrivacyLinkLabel: "Privacidad CMS",
  consentAfterLink: "Autorización CMS",
  responseTimeText: "Respuesta CMS",
  submitLabel: "Enviar CMS",
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getContactPage.mockResolvedValue(cmsCopy);
  mocks.getContactProductOptions.mockResolvedValue([
    { slug: "silla", name: "Silla institucional" },
  ]);
  mocks.getContactProductBySlug.mockResolvedValue({ slug: "silla", name: "Silla institucional" });
  mocks.getSiteSettings.mockResolvedValue({
    siteName: "ENE-MUEBLES",
    contactEmail: "ventas@example.cl",
    contactPhone: "+56 45 222 0205",
    whatsappNumber: "+56 9 9539 5339",
    whatsappDefaultMessage: "Hola CMS",
    businessHours: "Lun a Vie · 09:00–18:00",
    address: "Cautín 1782",
    addressCity: "Temuco",
    addressRegion: "La Araucanía",
  });
});

async function renderPage() {
  const { default: ContactoPage } = await import("./page");
  return renderToStaticMarkup(
    await ContactoPage({ searchParams: Promise.resolve({ product: "silla" }) }),
  );
}

describe("/contacto", () => {
  it("renders CMS copy, dynamic Site Setting values and the fixed privacy URL", async () => {
    const html = await renderPage();

    for (const value of Object.values(cmsCopy)) {
      expect(html).toContain(value);
    }
    expect(html).toContain("ventas@example.cl");
    expect(html).toContain("+56 45 222 0205");
    expect(html).toContain("+56 9 9539 5339");
    expect(html).toContain("Lun a Vie · 09:00–18:00");
    expect(html).toContain("Cautín 1782, Temuco, La Araucanía");
    expect(html).toContain('href="/privacidad"');
    expect(html).toContain("Silla institucional");
  });
});

describe("/contacto metadata", () => {
  it("uses Contact-owned SEO fields and ignores search parameters in the canonical", async () => {
    mocks.getContactPage.mockResolvedValue({
      ...cmsCopy,
      seoTitle: "Contacto CMS",
      seoDescription: "Descripción contacto CMS",
    });
    mocks.getSiteSettings.mockResolvedValue({ siteName: "Marca CMS" });
    const { generateMetadata } = await import("./page");
    const metadata = await generateMetadata();
    expect(metadata.title).toEqual({ absolute: "Contacto CMS · Marca CMS" });
    expect(metadata.alternates).toEqual({ canonical: "https://ene-muebles.cl/contacto" });
    expect(metadata.openGraph).toMatchObject({
      url: "https://ene-muebles.cl/contacto",
      description: "Descripción contacto CMS",
    });
  });
});
