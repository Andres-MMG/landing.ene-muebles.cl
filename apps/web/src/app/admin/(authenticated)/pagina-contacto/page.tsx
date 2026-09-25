import { ContactPageForm, type ContactPageFormValues } from "./ContactPageForm";
import { getStrapiAdminToken } from "@/lib/admin/strapi-admin";
import { sectionFallbacks, type ContactPage } from "@/lib/strapi";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const metadata = {
  title: "Página contacto · Ene Muebles",
  robots: { index: false, follow: false },
};

const STRAPI = (process.env.STRAPI_INTERNAL_URL ?? "http://cms:1337").replace(/\/+$/, "");

type ContactPageShape = Partial<ContactPage>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function getContactPageForAdmin(): Promise<ContactPageShape> {
  const token = getStrapiAdminToken().trim();
  const response = await fetch(STRAPI + "/api/contact-page?status=draft", {
    ...(token ? { headers: { Authorization: "Bearer " + token } } : {}),
    cache: "no-store",
  });

  if (response.status === 404) return sectionFallbacks.contactPage();
  if (!response.ok) {
    throw new Error("No se pudo cargar la página de contacto (" + response.status + ")");
  }

  const json: unknown = await response.json();
  if (!isRecord(json) || !Object.prototype.hasOwnProperty.call(json, "data")) {
    throw new Error("Strapi devolvió una respuesta inválida para la página de contacto");
  }
  if (json.data === null) return sectionFallbacks.contactPage();
  if (!isRecord(json.data)) {
    throw new Error("Strapi devolvió contenido inválido para la página de contacto");
  }
  return json.data as ContactPageShape;
}

function toFormValues(content: ContactPageShape): ContactPageFormValues {
  return {
    seoTitle: content.seoTitle ?? "",
    seoDescription: content.seoDescription ?? "",
    heroEyebrow: content.heroEyebrow ?? "",
    heroTitle: content.heroTitle ?? "",
    heroBody: content.heroBody ?? "",
    whatsappCtaLabel: content.whatsappCtaLabel ?? "",
    emailCtaLabel: content.emailCtaLabel ?? "",
    alternateContactEyebrow: content.alternateContactEyebrow ?? "",
    phoneContactLabel: content.phoneContactLabel ?? "",
    whatsappContactLabel: content.whatsappContactLabel ?? "",
    businessHoursLabel: content.businessHoursLabel ?? "",
    addressLabel: content.addressLabel ?? "",
    formEyebrow: content.formEyebrow ?? "",
    formTitle: content.formTitle ?? "",
    formBody: content.formBody ?? "",
    nameFieldLabel: content.nameFieldLabel ?? "",
    institutionFieldLabel: content.institutionFieldLabel ?? "",
    emailFieldLabel: content.emailFieldLabel ?? "",
    phoneFieldLabel: content.phoneFieldLabel ?? "",
    productFieldLabel: content.productFieldLabel ?? "",
    generalInquiryLabel: content.generalInquiryLabel ?? "",
    regionFieldLabel: content.regionFieldLabel ?? "",
    regionPlaceholder: content.regionPlaceholder ?? "",
    messageFieldLabel: content.messageFieldLabel ?? "",
    consentBeforeLink: content.consentBeforeLink ?? "",
    consentPrivacyLinkLabel: content.consentPrivacyLinkLabel ?? "",
    consentAfterLink: content.consentAfterLink ?? "",
    responseTimeText: content.responseTimeText ?? "",
    submitLabel: content.submitLabel ?? "",
  };
}

export default async function AdminContactPage() {
  const content = await getContactPageForAdmin();

  return (
    <div
      aria-label="Editor de la página de contacto"
      className="mx-auto w-full max-w-[1440px] px-6 py-12 sm:px-10 lg:px-16 lg:py-16"
    >
      <div className="border-b border-ink-line pb-8">
        <p className="t-mono text-[11px] uppercase tracking-[0.22em] text-taupe-deep">
          Contenido del sitio
        </p>
        <h1 className="t-display mt-3 text-4xl text-ink">Página de contacto</h1>
        <p className="t-mono mt-3 text-sm text-ink-mute">
          Textos editoriales de la cabecera, canales alternativos y formulario público. Los datos de
          contacto se mantienen en Ajustes.
        </p>
      </div>

      <div className="mt-10 rounded-sm border border-ink-line bg-paper-pure p-6 sm:p-10">
        <ContactPageForm initial={toFormValues(content)} />
      </div>
    </div>
  );
}
