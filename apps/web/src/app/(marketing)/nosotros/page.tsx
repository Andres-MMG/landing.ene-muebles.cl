import Link from "next/link";
import { getAboutSection, getContactCTASection, getProductCount, getSiteSettings } from "@/lib/strapi";
import { site } from "@ene/ui-tokens";
import { ContactCTA } from "@/components/ContactCTA";

// Must not be statically prerendered at build time: this page fetches
// site settings and sections from the CMS, which is unreachable during
// `next build` in the Coolify compose topology. The fetches in
// lib/strapi.ts keep their own 60s SWR cache at runtime.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Sobre nosotros",
  description:
    "Ene Muebles: proveedor de mobiliario escolar y de oficina para instituciones en Chile. Misión, visión y valores.",
};

export default async function NosotrosPage() {
  const settings = await getSiteSettings();
  // Batch 2: mission/vision/values copy comes from the `about-section`
  // singleton (always with a fallback). The hero "Sobre nosotros"
  // overline/heading stays on ui-tokens because those are page-level
  // page-title chrome, not section copy.
  const [aboutSection, contactCtaSection] = await Promise.all([
    getAboutSection(),
    getContactCTASection(),
  ]);
  // B1 (U5): live active-product count like the home/footer read.
  // `getProductCount` never throws — it returns 0 when Strapi is
  // unreachable — so the "20" placeholder below is the LAST-resort
  // fallback and only renders when the CMS is down (a genuine empty
  // catalog would also report 0; the client will seed products before
  // launch).
  const productCount = await getProductCount();
  const categoryCount = 2;
  const years = 30;

  return (
    <>
      <section aria-labelledby="nosotros-heading" className="bg-paper">
        <div className="mx-auto grid w-full max-w-[1440px] grid-cols-1 gap-12 px-6 pt-24 pb-16 sm:px-10 sm:pt-28 sm:pb-20 lg:grid-cols-12 lg:gap-16 lg:px-16 lg:pt-32 lg:pb-24">
          <div className="lg:col-span-7">
            <div className="flex items-center gap-3">
              <span className="block h-px w-10 bg-taupe" aria-hidden />
              <span className="t-label text-taupe-text">
                {site.aboutOverlineSec}
              </span>
            </div>
            <h1
              id="nosotros-heading"
              className="t-display mt-8 max-w-[20ch] text-[clamp(2.5rem,1.25rem+5vw,5rem)] text-ink"
            >
              {site.aboutHeadingSec}
            </h1>
            <p className="t-body mt-8 max-w-[55ch] text-lg text-ink-mute sm:text-xl">
              {aboutSection.intro ?? site.aboutIntro}
            </p>
          </div>
          <aside className="lg:col-span-4 lg:col-start-9">
            <dl className="space-y-0 border-t border-ink-line">
              <div className="flex items-baseline justify-between border-b border-ink-line py-5">
                <dt className="t-mono text-[10px] uppercase tracking-[0.22em] text-ink-soft-text">
                  Años en el rubro
                </dt>
                <dd className="t-mono text-3xl text-ink">
                  {String(years).padStart(2, "0")}
                </dd>
              </div>
              <div className="flex items-baseline justify-between border-b border-ink-line py-5">
                <dt className="t-mono text-[10px] uppercase tracking-[0.22em] text-ink-soft-text">
                  Productos en catálogo
                </dt>
                <dd className="t-mono text-3xl text-ink">
                  {String(productCount > 0 ? productCount : 20).padStart(2, "0")}
                </dd>
              </div>
              <div className="flex items-baseline justify-between border-b border-ink-line py-5">
                <dt className="t-mono text-[10px] uppercase tracking-[0.22em] text-ink-soft-text">
                  Líneas de producto
                </dt>
                <dd className="t-mono text-3xl text-ink">
                  {String(categoryCount).padStart(2, "0")}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-4 py-5">
                <dt className="t-mono text-[10px] uppercase tracking-[0.22em] text-ink-soft-text">
                  Cobertura
                </dt>
                {/* B1 (U6): the "V – X" region-range claim is gone; the
                    row reads the site-setting coverage field. */}
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
              <li
                key={value.title ?? index}
                className="relative border-t border-ink-line pt-6"
              >
                <span className="t-mono text-[10px] uppercase tracking-[0.22em] text-ink-soft-text">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="t-h2 mt-3 text-2xl text-ink">{value.title}</h3>
                <p className="t-body mt-4 text-base text-ink-mute">
                  {value.body}
                </p>
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
                ¿Listo para cotizar tu proyecto institucional?
              </h2>
            </div>
            <div className="lg:col-span-4 lg:col-start-9">
              <p className="t-body text-base text-ink-mute">
                Envíanos tu lista, región y plazos. Te respondemos con
                ficha técnica y propuesta en 24 h hábiles.
              </p>
              <Link
                href="/contacto"
                className="t-label mt-6 inline-flex items-center gap-2 text-ink underline-offset-[6px] hover:text-taupe-text hover:underline tap-target"
              >
                Ir a contacto
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
