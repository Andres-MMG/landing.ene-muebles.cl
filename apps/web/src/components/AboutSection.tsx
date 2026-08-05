import type { AboutSection } from "@/lib/strapi";
import { site } from "@ene/ui-tokens";

type AboutSectionProps = {
  aboutText?: string;
  siteName: string;
  productCount?: number;
  categoryCount?: number;
  /**
   * Batch 2: when provided, eyebrow/title/intro come from the Strapi
   * `about-section` singleton (which already returns a typed fallback
   * when Strapi is unreachable). The legacy `aboutText` prop is kept
   * as a final fallback so older callers that only have site-setting
   * data still render correctly.
   */
  section?: AboutSection;
};

/**
 * About — ink-drenched conviction block.
 *
 * Tables turned: this is the dark interlude that breaks the page rhythm.
 * One bold heading, then the long-form body, then a thin mono rail with
 * the verifiable proof points. No stats hardcoded as filler — the counts
 * come from the catalog so they stay honest.
 */
export function AboutSection({
  aboutText,
  siteName,
  productCount,
  categoryCount,
  section,
}: AboutSectionProps) {
  const eyebrow = section?.eyebrow ?? site.aboutOverline;
  const title = section?.title ?? site.aboutHeading;
  const intro = section?.intro ?? null;
  const body = section?.body ?? aboutText ?? null;
  // B2 batch 2 fix: render the section when ANY meaningful content is
  // available, not only when the body is set. The editor may have
  // intentionally cleared the body while keeping the header copy; we
  // do not want the entire dark block to disappear silently. When the
  // body is empty but the header exists, we still render the header
  // with a graceful "no body" mono line so the design rhythm stays.
  const hasHeader = Boolean(eyebrow || title || intro);
  if (!body && !intro && !title && !eyebrow) return null;
  if (!body && !hasHeader) return null;

  return (
    <section
      aria-labelledby="about-heading"
      className="relative bg-ink text-paper"
    >
      <div className="mx-auto w-full max-w-[1440px] px-6 pt-24 pb-20 sm:px-10 sm:pt-28 sm:pb-24 lg:px-16 lg:pt-36 lg:pb-28">
        <header className="grid grid-cols-1 gap-10 border-b border-paper-line-on-ink pb-12 lg:grid-cols-12 lg:gap-12 lg:pb-16">
          <div className="lg:col-span-5">
            <div className="flex items-center gap-3">
              <span className="block h-px w-10 bg-taupe" aria-hidden />
              <span className="t-label text-taupe">
                {eyebrow}
              </span>
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
              <p className="t-mono text-[11px] uppercase tracking-[0.22em] text-paper-mute-on-ink">
                Contenido en preparación.
              </p>
            )}
          </div>
          <aside className="lg:col-span-4 lg:col-start-9">
            <dl className="border-t border-paper-line-on-ink pt-6">
              {productCount !== undefined ? (
                <div className="flex items-baseline justify-between border-b border-paper-line-on-ink py-4">
                  <dt className="t-mono text-[11px] uppercase tracking-[0.22em] text-paper-mute-on-ink">
                    Productos en catálogo
                  </dt>
                  <dd className="t-mono text-2xl text-paper">
                    {String(productCount).padStart(2, "0")}
                  </dd>
                </div>
              ) : null}
              {categoryCount !== undefined ? (
                <div className="flex items-baseline justify-between border-b border-paper-line-on-ink py-4">
                  <dt className="t-mono text-[11px] uppercase tracking-[0.22em] text-paper-mute-on-ink">
                    Líneas de producto
                  </dt>
                  <dd className="t-mono text-2xl text-paper">
                    {String(categoryCount).padStart(2, "0")}
                  </dd>
                </div>
              ) : null}
              <div className="flex items-baseline justify-between border-b border-paper-line-on-ink py-4">
                <dt className="t-mono text-[11px] uppercase tracking-[0.22em] text-paper-mute-on-ink">
                  Cobertura
                </dt>
                <dd className="t-mono text-2xl text-paper">V – X</dd>
              </div>
              <div className="flex items-baseline justify-between py-4">
                <dt className="t-mono text-[11px] uppercase tracking-[0.22em] text-paper-mute-on-ink">
                  Garantía
                </dt>
                <dd className="t-mono text-2xl text-paper">1 año</dd>
              </div>
            </dl>
          </aside>
        </div>
      </div>
    </section>
  );
}

/**
 * Stripped-down version for non-home pages (e.g. /catalogo) — same ink
 * surface, no stats rail.
 */
export function AboutSectionCompact({
  aboutText,
  siteName,
  section,
}: Pick<AboutSectionProps, "aboutText" | "siteName"> & {
  section?: AboutSection;
}) {
  const eyebrow = section?.eyebrow ?? site.aboutOverline;
  const title = section?.title ?? site.aboutHeading;
  const body = section?.body ?? aboutText ?? null;
  // B2 batch 2 fix: same as the full AboutSection — render when the
  // header copy is populated even if the body was intentionally cleared.
  if (!body && !title && !eyebrow) return null;
  return (
    <section
      aria-labelledby="about-compact-heading"
      className="bg-ink text-paper"
    >
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
              <p className="t-mono text-[11px] uppercase tracking-[0.22em] text-paper-mute-on-ink">
                Contenido en preparación.
              </p>
            )}
            <p className="t-mono mt-8 text-[11px] uppercase tracking-[0.22em] text-paper-mute-on-ink">
              {siteName}
            </p>
          </div>
        </header>
      </div>
    </section>
  );
}
