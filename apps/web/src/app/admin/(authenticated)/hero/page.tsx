import { HeroSectionForm } from "./HeroSectionForm";
import { getStrapiAdminToken } from "@/lib/admin/strapi-admin";
import { resolveSection, sectionFallbacks } from "@/lib/strapi";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const metadata = {
  title: "Hero · Ene Muebles",
  robots: { index: false, follow: false },
};

const STRAPI = (process.env.STRAPI_INTERNAL_URL ?? "http://cms:1337").replace(/\/+$/, "");

type HeroShape = {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  primaryCtaLabel?: string;
  primaryCtaHref?: string;
  secondaryCtaLabel?: string;
  secondaryCtaHref?: string;
  imageCaption?: string;
  galleryCaption?: string;
  railSecondaryText?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Preserve absent/legacy-empty fallback without masking operational failures. */
export async function getHeroSection(): Promise<HeroShape> {
  const token = getStrapiAdminToken().trim();
  const response = await fetch(`${STRAPI}/api/hero-section?populate=*`, {
    ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}),
    cache: "no-store",
  });

  if (response.status === 404) return sectionFallbacks.hero();
  if (!response.ok) {
    throw new Error(`No se pudo cargar el hero (${response.status})`);
  }

  const json: unknown = await response.json();
  if (!isRecord(json) || !Object.prototype.hasOwnProperty.call(json, "data")) {
    throw new Error("Strapi devolvió una respuesta inválida para el hero");
  }

  if (json.data === null) return sectionFallbacks.hero();
  if (!isRecord(json.data)) {
    throw new Error("Strapi devolvió contenido inválido para el hero");
  }

  return resolveSection(json.data as HeroShape, sectionFallbacks.hero());
}

/**
 * Admin editor for the `hero-section` singleton. Image upload is
 * deliberately out of scope for this batch — it lives behind the same
 * dedicated upload flow as `SiteSettingForm.heroImage` and product
 * images. The form edits copy + CTA targets only.
 */
export default async function AdminHeroPage() {
  const setting = await getHeroSection();

  return (
    <div
      aria-label="Editor del hero"
      className="mx-auto w-full max-w-[1440px] px-6 py-12 sm:px-10 lg:px-16 lg:py-16"
    >
      <div aria-label="Cabecera del hero" className="border-b border-ink-line pb-8">
        <p className="t-mono text-[11px] uppercase tracking-[0.22em] text-taupe-deep">
          Contenido del sitio
        </p>
        <h1 className="t-display mt-3 text-4xl text-ink">Hero de la portada</h1>
        <p className="t-mono mt-3 text-sm text-ink-mute">
          Eyebrow, título, bajada y los dos botones (CTA principal + secundario). Afecta solo a la
          página de inicio.
        </p>
      </div>

      <div className="mt-10 rounded-sm border border-ink-line bg-paper-pure p-6 sm:p-10">
        <HeroSectionForm
          initial={{
            eyebrow: setting.eyebrow ?? "",
            title: setting.title ?? "",
            subtitle: setting.subtitle ?? "",
            primaryCtaLabel: setting.primaryCtaLabel ?? "",
            primaryCtaHref: setting.primaryCtaHref ?? "",
            secondaryCtaLabel: setting.secondaryCtaLabel ?? "",
            secondaryCtaHref: setting.secondaryCtaHref ?? "",
            imageCaption: setting.imageCaption ?? "",
            galleryCaption: setting.galleryCaption ?? "",
            railSecondaryText: setting.railSecondaryText ?? "",
          }}
        />
      </div>
    </div>
  );
}
