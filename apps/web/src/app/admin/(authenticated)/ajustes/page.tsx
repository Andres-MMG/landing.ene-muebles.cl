import { SiteSettingForm } from "./SiteSettingForm";
import { getStrapiAdminToken } from "@/lib/admin/strapi-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const metadata = {
  title: "Ajustes · Ene Muebles",
  robots: { index: false, follow: false },
};

const STRAPI = (process.env.STRAPI_INTERNAL_URL ?? "http://cms:1337").replace(/\/+$/, "");
const TOKEN = getStrapiAdminToken().trim();

type SettingsShape = {
  siteName?: string;
  tagline?: string;
  seoTitle?: string | null;
  seoDescription?: string | null;
  seoShareImageKicker?: string | null;
  seoShareImageTitle?: string | null;
  seoShareImageDescription?: string | null;
  seoShareImageFooter?: string | null;
  seoShareImageAlt?: string | null;
  rut?: string;
  contactEmail?: string;
  contactPhone?: string;
  whatsappNumber?: string;
  whatsappDefaultMessage?: string;
  address?: string;
  dispatchCoverage?: string;
  addressCity?: string;
  addressRegion?: string;
  businessHours?: string;
  aboutText?: string;
  paymentTermsText?: string;
  warrantyText?: string;
  quoteResponseTimeText?: string;
  navigationHomeLabel?: string | null;
  navigationCatalogLabel?: string | null;
  navigationAboutLabel?: string | null;
  navigationContactLabel?: string | null;
  headerWhatsappLabel?: string | null;
  mobileWhatsappLabel?: string | null;
  whatsappProductMessageTemplate?: string | null;
  productCardDetailLabel?: string | null;
  productCardWhatsappLabel?: string | null;
  productDetailWhatsappLabel?: string | null;
  productDetailContactLabel?: string | null;
  foundedYear?: number;
  socialLinks?: {
    facebook?: string;
    instagram?: string;
    tiktok?: string;
    linkedin?: string;
  };
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Read the singleton without turning operational failures into an editable
 * blank record. Only an explicit 404 or a valid `{ data: null }` envelope
 * represents an absent singleton; real partial documents remain primary.
 */
async function getSiteSetting(): Promise<SettingsShape | null> {
  const response = await fetch(`${STRAPI}/api/site-setting?populate=*&status=draft`, {
    ...(TOKEN ? { headers: { Authorization: `Bearer ${TOKEN}` } } : {}),
    cache: "no-store",
  });

  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`No se pudieron cargar los ajustes del sitio (${response.status})`);
  }

  const json: unknown = await response.json();
  if (!isRecord(json) || !Object.prototype.hasOwnProperty.call(json, "data")) {
    throw new Error("Strapi devolvió una respuesta inválida para los ajustes del sitio");
  }

  if (json.data === null) return null;
  if (!isRecord(json.data)) {
    throw new Error("Strapi devolvió contenido inválido para los ajustes del sitio");
  }

  return json.data as SettingsShape;
}

export { getSiteSetting };

export default async function AdminSettingsPage() {
  // Auth + user lookup are owned by the shared admin layout.
  const setting = await getSiteSetting();

  return (
    <div
      aria-label="Ajustes del sitio"
      className="mx-auto w-full max-w-[1440px] px-6 py-12 sm:px-10 lg:px-16 lg:py-16"
    >
      <div aria-label="Cabecera de ajustes" className="border-b border-ink-line pb-8">
        <p className="t-mono text-[11px] uppercase tracking-[0.22em] text-taupe-deep">
          Configuración
        </p>
        <h1 className="t-display mt-3 text-4xl text-ink">Ajustes del sitio</h1>
        <p className="t-mono mt-3 text-sm text-ink-mute">
          Datos de marca, contacto y portada. Afectan al sitio público al siguiente request.
        </p>
      </div>

      <div className="mt-10 rounded-sm border border-ink-line bg-paper-pure p-6 sm:p-10">
        <SiteSettingForm
          initial={{
            siteName: setting?.siteName ?? "",
            tagline: setting?.tagline ?? "",
            seoTitle: setting?.seoTitle ?? "",
            seoDescription: setting?.seoDescription ?? "",
            seoShareImageKicker: setting?.seoShareImageKicker ?? "",
            seoShareImageTitle: setting?.seoShareImageTitle ?? "",
            seoShareImageDescription: setting?.seoShareImageDescription ?? "",
            seoShareImageFooter: setting?.seoShareImageFooter ?? "",
            seoShareImageAlt: setting?.seoShareImageAlt ?? "",
            rut: setting?.rut ?? "",
            contactEmail: setting?.contactEmail ?? "",
            contactPhone: setting?.contactPhone ?? "",
            whatsappNumber: setting?.whatsappNumber ?? "",
            whatsappDefaultMessage: setting?.whatsappDefaultMessage ?? "",
            address: setting?.address ?? "",
            dispatchCoverage: setting?.dispatchCoverage ?? "",
            addressCity: setting?.addressCity ?? "",
            addressRegion: setting?.addressRegion ?? "",
            businessHours: setting?.businessHours ?? "",
            aboutText: setting?.aboutText ?? "",
            paymentTermsText: setting?.paymentTermsText ?? "",
            warrantyText: setting?.warrantyText ?? "",
            quoteResponseTimeText: setting?.quoteResponseTimeText ?? "",
            navigationHomeLabel: setting?.navigationHomeLabel ?? "",
            navigationCatalogLabel: setting?.navigationCatalogLabel ?? "",
            navigationAboutLabel: setting?.navigationAboutLabel ?? "",
            navigationContactLabel: setting?.navigationContactLabel ?? "",
            headerWhatsappLabel: setting?.headerWhatsappLabel ?? "",
            mobileWhatsappLabel: setting?.mobileWhatsappLabel ?? "",
            whatsappProductMessageTemplate: setting?.whatsappProductMessageTemplate ?? "",
            productCardDetailLabel: setting?.productCardDetailLabel ?? "",
            productCardWhatsappLabel: setting?.productCardWhatsappLabel ?? "",
            productDetailWhatsappLabel: setting?.productDetailWhatsappLabel ?? "",
            productDetailContactLabel: setting?.productDetailContactLabel ?? "",
            foundedYear: setting?.foundedYear ? String(setting.foundedYear) : "",
            socialInstagram: setting?.socialLinks?.instagram ?? "",
            socialFacebook: setting?.socialLinks?.facebook ?? "",
            socialLinkedIn: setting?.socialLinks?.linkedin ?? "",
            socialTiktok: setting?.socialLinks?.tiktok ?? "",
          }}
        />
      </div>
    </div>
  );
}
