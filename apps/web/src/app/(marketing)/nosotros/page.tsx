import type { Metadata } from "next";
import Link from "next/link";
import { ContactCTA } from "@/components/ContactCTA";
import {
  FALLBACK_SITE_SETTINGS,
  getAboutSection,
  getCategoryCount,
  getContactCTASection,
  getProductCount,
  getSiteSettings,
  type AboutSection,
} from "@/lib/strapi";
import { site } from "@ene/ui-tokens";
import { buildSeoMetadata, FALLBACK_SHARE_IMAGE_ALT, resolveSeoText } from "@/lib/seo-metadata";

export const dynamic = "force-dynamic";

const ABOUT_METADATA_TITLE = "Sobre nosotros";
const ABOUT_METADATA_DESCRIPTION =
  "Ene Muebles: proveedor de mobiliario escolar y de oficina para instituciones en Chile. Misión, visión y valores.";

export async function generateMetadata(): Promise<Metadata> {
  const [about, settings] = await Promise.all([
    getAboutSection(),
    getSiteSettings().catch(() => FALLBACK_SITE_SETTINGS),
  ]);
  return buildSeoMetadata({
    title: resolveSeoText(about.seoTitle) ?? ABOUT_METADATA_TITLE,
    description: resolveSeoText(about.seoDescription) ?? ABOUT_METADATA_DESCRIPTION,
    path: "/nosotros",
    siteName: settings.siteName,
    imageAlt: resolveSeoText(settings.seoShareImageAlt) ?? FALLBACK_SHARE_IMAGE_ALT,
  });
}

type NosotrosCopy = AboutSection & {
  pageEyebrow?: string;
  pageTitle?: string;
  yearsInBusinessLabel?: string;
  productCountLabel?: string;
  productLineCountLabel?: string;
  coverageLabel?: string;
  projectCtaTitle?: string;
  projectCtaBody?: string;
  projectCtaLabel?: string;
};

type SettingsWithFoundedYear = Awaited<ReturnType<typeof getSiteSettings>> & {
  foundedYear?: number;
};

export function yearsInBusiness(
  foundedYear: number | null | undefined,
  currentYear = new Date().getFullYear(),
): number {
  if (
    typeof foundedYear !== "number" ||
    !Number.isFinite(foundedYear) ||
    !Number.isInteger(foundedYear) ||
    foundedYear <= 0
  ) {
    return 30;
  }

  return Math.max(0, currentYear - foundedYear);
}

export default async function NosotrosPage() {
  const [settingsResult, aboutResult, contactCtaSection, productCount, categoryCount] =
    await Promise.all([
      getSiteSettings(),
      getAboutSection(),
      getContactCTASection(),
      getProductCount(),
      getCategoryCount().catch(() => 0),
    ]);

  const settings = settingsResult as SettingsWithFoundedYear;
  const aboutSection = aboutResult as NosotrosCopy;
  const years = yearsInBusiness(settings.foundedYear);

  return (
    <>
      <section aria-labelledby="nosotros-heading" className="bg-paper">
        <div className="mx-auto grid w-full max-w-[1440px] grid-cols-1 gap-12 px-6 pt-24 pb-16 sm:px-10 sm:pt-28 sm:pb-20 lg:grid-cols-12 lg:gap-16 lg:px-16 lg:pt-32 lg:pb-24">
          <div className="lg:col-span-7">
            <div className="flex items-center gap-3">
              <span className="block h-px w-10 bg-taupe" aria-hidden />
              <span className="t-label text-taupe-text">
                {aboutSection.pageEyebrow ?? site.aboutOverlineSec}
              </span>
            </div>
            <h1
              id="nosotros-heading"
              className="t-display mt-8 max-w-[20ch] text-[clamp(2.5rem,1.25rem+5vw,5rem)] text-ink"
            >
              {aboutSection.pageTitle ?? site.aboutHeadingSec}
            </h1>
            <p className="t-body mt-8 max-w-[55ch] text-lg text-ink-mute sm:text-xl">
              {aboutSection.intro ?? site.aboutIntro}
            </p>
          </div>
          <aside className="lg:col-span-4 lg:col-start-9">
            <dl className="space-y-0 border-t border-ink-line">
              <div className="flex items-baseline justify-between border-b border-ink-line py-5">
                <dt className="t-overline text-ink-mute">
                  {aboutSection.yearsInBusinessLabel ?? "Años en el rubro"}
                </dt>
                <dd className="t-mono text-3xl text-ink">{String(years).padStart(2, "0")}</dd>
              </div>
              <div className="flex items-baseline justify-between border-b border-ink-line py-5">
                <dt className="t-overline text-ink-mute">
                  {aboutSection.productCountLabel ?? "Productos en catálogo"}
                </dt>
                <dd className="t-mono text-3xl text-ink">
                  {String(productCount).padStart(2, "0")}
                </dd>
              </div>
              <div className="flex items-baseline justify-between border-b border-ink-line py-5">
                <dt className="t-overline text-ink-mute">
                  {aboutSection.productLineCountLabel ?? "Líneas de producto"}
                </dt>
                <dd className="t-mono text-3xl text-ink">
                  {String(categoryCount).padStart(2, "0")}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-4 py-5">
                <dt className="t-overline text-ink-mute">
                  {aboutSection.coverageLabel ?? "Cobertura"}
                </dt>
                <dd className="t-mono text-right text-sm text-ink">
                  {settings.dispatchCoverage ?? site.dispatchCoverageFallback}
                </dd>
              </div>
            </dl>
          </aside>
        </div>
      </section>

      <section className="bg-ink text-paper">
        <div className="mx-auto w-full max-w-[1440px] px-6 pt-24 pb-20 sm:px-10 sm:pt-28 sm:pb-24 lg:px-16 lg:pt-36 lg:pb-28">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-4">
              <div className="flex items-center gap-3">
                <span className="block h-px w-10 bg-taupe" aria-hidden />
                <span className="t-label text-taupe">
                  {aboutSection.missionLabel ?? site.missionLabel}
                </span>
              </div>
              <h2 className="t-h2 mt-6 text-[clamp(2rem,1.2rem+3vw,3rem)] text-paper">
                {aboutSection.missionHeading ?? site.missionHeading}
              </h2>
            </div>
            <div className="lg:col-span-7 lg:col-start-6">
              <p className="t-h3 text-2xl text-paper-mute-on-ink">
                {aboutSection.missionBody ?? site.missionBody}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-paper">
        <div className="mx-auto w-full max-w-[1440px] px-6 pt-24 pb-20 sm:px-10 sm:pt-28 sm:pb-24 lg:px-16 lg:pt-32 lg:pb-28">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-4">
              <div className="flex items-center gap-3">
                <span className="block h-px w-10 bg-taupe" aria-hidden />
                <span className="t-label text-taupe-text">
                  {aboutSection.visionLabel ?? site.visionLabel}
                </span>
              </div>
              <h2 className="t-h2 mt-6 text-[clamp(2rem,1.2rem+3vw,3rem)] text-ink">
                {aboutSection.visionHeading ?? site.visionHeading}
              </h2>
            </div>
            <div className="lg:col-span-7 lg:col-start-6">
              <p className="t-h3 text-2xl text-ink-mute">
                {aboutSection.visionBody ?? site.visionBody}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-cream-soft">
        <div className="mx-auto w-full max-w-[1440px] px-6 pt-24 pb-20 sm:px-10 sm:pt-28 sm:pb-24 lg:px-16 lg:pt-32 lg:pb-28">
          <header className="grid grid-cols-1 gap-8 border-b border-ink-line pb-12 lg:grid-cols-12 lg:gap-12">
            <div className="lg:col-span-7">
              <div className="flex items-center gap-3">
                <span className="block h-px w-10 bg-taupe" aria-hidden />
                <span className="t-label text-taupe-text">
                  {aboutSection.valuesLabel ?? site.valuesLabel}
                </span>
              </div>
              <h2 className="t-h2 mt-6 max-w-[24ch] text-[clamp(2rem,1.2rem+3vw,3.25rem)] text-ink">
                {aboutSection.valuesHeading ?? site.valuesHeading}
              </h2>
            </div>
          </header>
          <ol className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {(aboutSection.values ?? site.values).map((value, index) => (
              <li key={value.title ?? index} className="relative border-t border-ink-line pt-6">
                <span className="t-overline text-ink-mute">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="t-h2 mt-3 text-2xl text-ink">{value.title}</h3>
                <p className="t-body mt-4 text-base text-ink-mute">{value.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="bg-paper">
        <div className="mx-auto w-full max-w-[1440px] px-6 pt-24 pb-24 sm:px-10 sm:pt-28 sm:pb-28 lg:px-16 lg:pt-32 lg:pb-32">
          <div className="grid grid-cols-1 gap-8 border-b border-ink-line pb-12 lg:grid-cols-12 lg:gap-12">
            <div className="lg:col-span-7">
              <h2 className="t-h2 text-[clamp(2rem,1.2rem+3vw,3.25rem)] text-ink">
                {aboutSection.projectCtaTitle ?? "¿Listo para cotizar tu proyecto institucional?"}
              </h2>
            </div>
            <div className="lg:col-span-4 lg:col-start-9">
              <p className="t-body text-base text-ink-mute">
                {aboutSection.projectCtaBody ??
                  "Envíanos tu lista, región y plazos. Te respondemos con ficha técnica y propuesta en 24 h hábiles."}
              </p>
              <Link
                href="/contacto"
                className="t-label mt-6 inline-flex items-center gap-2 text-ink underline-offset-[6px] hover:text-taupe-text hover:underline tap-target"
              >
                {aboutSection.projectCtaLabel ?? "Ir a contacto"}
                <span aria-hidden>→</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <ContactCTA settings={settings} section={contactCtaSection} />
    </>
  );
}
