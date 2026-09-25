import type { AboutSection as AboutSectionModel } from "@/lib/strapi";
import { site } from "@ene/ui-tokens";

type AboutStatsCopy = {
  productCountLabel?: string;
  productLineCountLabel?: string;
  coverageLabel?: string;
  warrantyLabel?: string;
};

type AboutSectionContent = AboutSectionModel & AboutStatsCopy;

type AboutSectionProps = {
  aboutText?: string;
  siteName: string;
  productCount?: number;
  categoryCount?: number;
  dispatchCoverage?: string;
  warrantyText?: string;
  section?: AboutSectionContent;
};

const DEFAULT_PRODUCT_COUNT_LABEL = "Productos en catálogo";
const DEFAULT_PRODUCT_LINE_COUNT_LABEL = "Líneas de producto";
const DEFAULT_COVERAGE_LABEL = "Cobertura";
const DEFAULT_WARRANTY_LABEL = "Garantía";
const DEFAULT_WARRANTY_TEXT = "1 año";
const COMPACT_STAT_MAX_LENGTH = 160;

export function compactStatText(
  value: string | null | undefined,
  fallback: string,
  maxLength = COMPACT_STAT_MAX_LENGTH,
): string {
  const normalized = value?.replace(/\s+/g, " ").trim() || fallback;
  if (normalized.length <= maxLength) return normalized;
  return normalized.slice(0, Math.max(0, maxLength - 1)).trimEnd() + "…";
}

export function AboutSection({
  aboutText,
  siteName,
  productCount,
  categoryCount,
  dispatchCoverage,
  warrantyText,
  section,
}: AboutSectionProps) {
  const eyebrow = section?.eyebrow ?? site.aboutOverline;
  const title = section?.title ?? site.aboutHeading;
  const intro = section?.intro ?? null;
  const body = section?.body ?? aboutText ?? null;
  const hasHeader = Boolean(eyebrow || title || intro);

  if (!body && !intro && !title && !eyebrow) return null;
  if (!body && !hasHeader) return null;

  const coverage = compactStatText(dispatchCoverage, site.dispatchCoverageFallback);
  const warranty = compactStatText(warrantyText, DEFAULT_WARRANTY_TEXT);

  return (
    <section aria-labelledby="about-heading" className="relative bg-ink text-paper">
      <div className="mx-auto w-full max-w-[1440px] px-6 pt-24 pb-20 sm:px-10 sm:pt-28 sm:pb-24 lg:px-16 lg:pt-36 lg:pb-28">
        <header className="grid grid-cols-1 gap-10 border-b border-paper-line-on-ink pb-12 lg:grid-cols-12 lg:gap-12 lg:pb-16">
          <div className="lg:col-span-5">
            <div className="flex items-center gap-3">
              <span className="block h-px w-10 bg-taupe" aria-hidden />
              <span className="t-label text-taupe">{eyebrow}</span>
            </div>
            <h2
              id="about-heading"
              className="t-h2 mt-6 max-w-[22ch] text-[clamp(2rem,1.2rem+3vw,3.25rem)] text-paper"
            >
              {title}
            </h2>
          </div>
          <div className="lg:col-span-6 lg:col-start-7">
            <p className="t-h3 text-xl text-paper-mute-on-ink sm:text-2xl">
              {intro
                ? intro.replace(/\{siteName\}/g, siteName)
                : `${siteName} fabrica y distribuye mobiliario escolar y de oficina bajo estándares de pliego público. Cada pieza se entrega con ficha técnica, declaración de materiales y plazo de despacho por escrito.`}
            </p>
          </div>
        </header>

        <div className="mt-16 grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-7">
            {body ? (
              <div className="space-y-6 text-pretty text-lg leading-[1.7] text-paper-mute-on-ink">
                {body
                  .split(/\n{2,}|(?<=\.)\s+/)
                  .filter((paragraph) => paragraph.trim().length > 0)
                  .map((paragraph, index) => (
                    <p key={index}>{paragraph}</p>
                  ))}
              </div>
            ) : (
              <p className="t-overline text-paper-mute-on-ink">Contenido en preparación.</p>
            )}
          </div>
          <aside className="lg:col-span-4 lg:col-start-9">
            <dl className="border-t border-paper-line-on-ink pt-6">
              {productCount !== undefined ? (
                <div className="flex items-baseline justify-between border-b border-paper-line-on-ink py-4">
                  <dt className="t-overline text-paper-mute-on-ink">
                    {section?.productCountLabel ?? DEFAULT_PRODUCT_COUNT_LABEL}
                  </dt>
                  <dd className="t-mono text-2xl text-paper">
                    {String(productCount).padStart(2, "0")}
                  </dd>
                </div>
              ) : null}
              {categoryCount !== undefined ? (
                <div className="flex items-baseline justify-between border-b border-paper-line-on-ink py-4">
                  <dt className="t-overline text-paper-mute-on-ink">
                    {section?.productLineCountLabel ?? DEFAULT_PRODUCT_LINE_COUNT_LABEL}
                  </dt>
                  <dd className="t-mono text-2xl text-paper">
                    {String(categoryCount).padStart(2, "0")}
                  </dd>
                </div>
              ) : null}
              <div className="flex items-baseline justify-between gap-4 border-b border-paper-line-on-ink py-4">
                <dt className="t-overline text-paper-mute-on-ink">
                  {section?.coverageLabel ?? DEFAULT_COVERAGE_LABEL}
                </dt>
                <dd
                  className="t-mono max-w-[22ch] break-words text-right text-sm leading-snug text-paper"
                  title={dispatchCoverage?.trim() || undefined}
                >
                  {coverage}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-4 py-4">
                <dt className="t-overline text-paper-mute-on-ink">
                  {section?.warrantyLabel ?? DEFAULT_WARRANTY_LABEL}
                </dt>
                <dd
                  className="t-mono max-w-[22ch] break-words text-right text-sm leading-snug text-paper"
                  title={warrantyText?.trim() || undefined}
                >
                  {warranty}
                </dd>
              </div>
            </dl>
          </aside>
        </div>
      </div>
    </section>
  );
}

export function AboutSectionCompact({
  aboutText,
  siteName,
  section,
}: Pick<AboutSectionProps, "aboutText" | "siteName"> & {
  section?: AboutSectionContent;
}) {
  const eyebrow = section?.eyebrow ?? site.aboutOverline;
  const title = section?.title ?? site.aboutHeading;
  const body = section?.body ?? aboutText ?? null;
  if (!body && !title && !eyebrow) return null;

  return (
    <section aria-labelledby="about-compact-heading" className="bg-ink text-paper">
      <div className="mx-auto w-full max-w-[1440px] px-6 py-20 sm:px-10 sm:py-24 lg:px-16 lg:py-28">
        <header className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-4">
            <div className="flex items-center gap-3">
              <span className="block h-px w-10 bg-taupe" aria-hidden />
              <span className="t-label text-taupe">{eyebrow}</span>
            </div>
            <h2
              id="about-compact-heading"
              className="t-h2 mt-6 text-[clamp(1.75rem,1.2rem+2.2vw,2.5rem)] text-paper"
            >
              {title}
            </h2>
          </div>
          <div className="lg:col-span-7 lg:col-start-6">
            {body ? (
              <div className="space-y-5 text-pretty text-lg leading-[1.7] text-paper-mute-on-ink">
                {body
                  .split(/\n{2,}|(?<=\.)\s+/)
                  .filter((paragraph) => paragraph.trim().length > 0)
                  .map((paragraph, index) => (
                    <p key={index}>{paragraph}</p>
                  ))}
              </div>
            ) : (
              <p className="t-overline text-paper-mute-on-ink">Contenido en preparación.</p>
            )}
            <p className="t-overline mt-8 text-paper-mute-on-ink">{siteName}</p>
          </div>
        </header>
      </div>
    </section>
  );
}
