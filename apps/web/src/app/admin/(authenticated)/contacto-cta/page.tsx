import { site as siteTokens } from "@ene/ui-tokens";
import { ContactCtaSectionForm } from "./ContactCtaSectionForm";
import { sectionFallbacks } from "@/lib/strapi";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const metadata = {
  title: "Contacto CTA · Ene Muebles",
  robots: { index: false, follow: false },
};

const STRAPI = (process.env.STRAPI_INTERNAL_URL ?? "http://cms:1337").replace(/\/+$/, "");
const TOKEN = process.env.STRAPI_API_TOKEN?.trim();

type ContactCtaShape = {
  eyebrow?: string;
  title?: string;
  body?: string;
  buttonLabel?: string;
  buttonHref?: string;
  emailLabel?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function contactCtaFallback(): ContactCtaShape {
  const fallback = sectionFallbacks.contactCta() as ContactCtaShape;
  return {
    ...fallback,
    eyebrow: fallback.eyebrow ?? siteTokens.contactOverline,
    emailLabel: fallback.emailLabel ?? siteTokens.emailLabel,
  };
}

/**
 * Read the singleton without masking operational failures. Fallback
 * copy represents only a missing singleton (404 or `data: null`);
 * an existing partial document remains the editor's primary value.
 */
export async function getContactCtaSection(): Promise<ContactCtaShape> {
  const response = await fetch(`${STRAPI}/api/contact-cta-section`, {
    ...(TOKEN ? { headers: { Authorization: `Bearer ${TOKEN}` } } : {}),
    cache: "no-store",
  });

  if (response.status === 404) return contactCtaFallback();
  if (!response.ok) {
    throw new Error(`No se pudo cargar el bloque Contacto CTA (${response.status})`);
  }

  const json: unknown = await response.json();
  if (!isRecord(json) || !Object.prototype.hasOwnProperty.call(json, "data")) {
    throw new Error("Strapi devolvió una respuesta inválida para el bloque Contacto CTA");
  }

  if (json.data === null) return contactCtaFallback();
  if (!isRecord(json.data)) {
    throw new Error("Strapi devolvió contenido inválido para el bloque Contacto CTA");
  }

  return json.data as ContactCtaShape;
}

/**
 * Admin editor for the shared dark call-to-action rendered on the
 * home, about, catalog, category, and product pages. `/contacto`
 * owns a separate page-specific block. An empty button URL keeps the
 * existing WhatsApp handoff built from the site settings.
 */
export default async function AdminContactCtaPage() {
  const setting = await getContactCtaSection();

  return (
    <div
      aria-label="Editor del bloque 'contacto CTA'"
      className="mx-auto w-full max-w-[1440px] px-6 py-12 sm:px-10 lg:px-16 lg:py-16"
    >
      <div aria-label="Cabecera del contacto CTA" className="border-b border-ink-line pb-8">
        <p className="t-mono text-[11px] uppercase tracking-[0.22em] text-taupe-deep">
          Contenido del sitio
        </p>
        <h1 className="t-display mt-3 text-4xl text-ink">Bloque «Contacto CTA»</h1>
        <p className="t-mono mt-3 text-sm text-ink-mute">
          Bloque oscuro compartido al cierre de inicio, nosotros, catálogo, categorías y productos.
          Si dejas la URL vacía, el botón redirige a WhatsApp usando el número del sitio.
        </p>
      </div>

      <div className="mt-10 rounded-sm border border-ink-line bg-paper-pure p-6 sm:p-10">
        <ContactCtaSectionForm
          initial={{
            eyebrow: setting.eyebrow ?? "",
            title: setting.title ?? "",
            body: setting.body ?? "",
            buttonLabel: setting.buttonLabel ?? "",
            buttonHref: setting.buttonHref ?? "",
            emailLabel: setting.emailLabel ?? "",
          }}
        />
      </div>
    </div>
  );
}
