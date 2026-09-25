import { FooterBlockForm, type FooterBlockFormValues } from "./FooterBlockForm";
import { getStrapiAdminToken } from "@/lib/admin/strapi-admin";
import { sectionFallbacks, type FooterBlock } from "@/lib/strapi";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const metadata = {
  title: "Footer · Ene Muebles",
  robots: { index: false, follow: false },
};

const STRAPI = (process.env.STRAPI_INTERNAL_URL ?? "http://cms:1337").replace(/\/+$/, "");

type FooterBlockCopy = FooterBlock &
  Partial<{
    productCountSuffix: string;
    catalogHeading: string;
    contactHeading: string;
    legalHeading: string;
    socialHeading: string;
    catalogCtaLabel: string;
    officeLineLabel: string;
    schoolLineLabel: string;
    aboutLinkLabel: string;
    termsLinkLabel: string;
    privacyLinkLabel: string;
    rutLabel: string;
    catalogStampLabel: string;
    writtenBackingLabel: string;
  }>;

type FooterBlockShape = Partial<FooterBlockCopy>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function getFooterBlockForAdmin(): Promise<FooterBlockShape> {
  const token = getStrapiAdminToken().trim();
  const response = await fetch(STRAPI + "/api/footer-block?status=draft", {
    ...(token ? { headers: { Authorization: "Bearer " + token } } : {}),
    cache: "no-store",
  });

  if (response.status === 404) return sectionFallbacks.footer();
  if (!response.ok) {
    throw new Error("No se pudo cargar el footer (" + response.status + ")");
  }

  let json: unknown;
  try {
    json = await response.json();
  } catch {
    throw new Error("Strapi devolvió una respuesta inválida para el footer");
  }

  if (!isRecord(json) || !Object.prototype.hasOwnProperty.call(json, "data")) {
    throw new Error("Strapi devolvió una respuesta inválida para el footer");
  }
  if (json.data === null) return sectionFallbacks.footer();
  if (!isRecord(json.data)) {
    throw new Error("Strapi devolvió contenido inválido para el footer");
  }

  return json.data as FooterBlockShape;
}

function toFormValues(content: FooterBlockShape): FooterBlockFormValues {
  return {
    copyrightText: content.copyrightText ?? "",
    tagline: content.tagline ?? "",
    legalSnippet: content.legalSnippet ?? "",
    productCountSuffix: content.productCountSuffix ?? "",
    catalogHeading: content.catalogHeading ?? "",
    contactHeading: content.contactHeading ?? "",
    legalHeading: content.legalHeading ?? "",
    socialHeading: content.socialHeading ?? "",
    catalogCtaLabel: content.catalogCtaLabel ?? "",
    officeLineLabel: content.officeLineLabel ?? "",
    schoolLineLabel: content.schoolLineLabel ?? "",
    aboutLinkLabel: content.aboutLinkLabel ?? "",
    termsLinkLabel: content.termsLinkLabel ?? "",
    privacyLinkLabel: content.privacyLinkLabel ?? "",
    rutLabel: content.rutLabel ?? "",
    catalogStampLabel: content.catalogStampLabel ?? "",
    writtenBackingLabel: content.writtenBackingLabel ?? "",
  };
}

export default async function AdminFooterPage() {
  const content = await getFooterBlockForAdmin();

  return (
    <div
      aria-label="Editor del footer"
      className="mx-auto w-full max-w-[1440px] px-6 py-12 sm:px-10 lg:px-16 lg:py-16"
    >
      <div aria-label="Cabecera del footer" className="border-b border-ink-line pb-8">
        <p className="t-mono text-[11px] uppercase tracking-[0.22em] text-taupe-deep">
          Contenido del sitio
        </p>
        <h1 className="t-display mt-3 text-4xl text-ink">Footer del sitio</h1>
        <p className="t-mono mt-3 max-w-[90ch] text-sm text-ink-mute">
          Textos editoriales del pie de página. Los datos de empresa, contacto, cobertura, garantía
          y redes sociales se administran en Ajustes. Los destinos de los enlaces, el conteo de
          productos y el año permanecen automáticos.
        </p>
      </div>

      <div className="mt-10 rounded-sm border border-ink-line bg-paper-pure p-6 sm:p-10">
        <FooterBlockForm initial={toFormValues(content)} />
      </div>
    </div>
  );
}
