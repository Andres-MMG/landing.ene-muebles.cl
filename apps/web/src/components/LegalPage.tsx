import type { LegalPage as LegalPageModel } from "@/lib/legal-pages";

function sectionId(code: LegalPageModel["code"], index: number): string {
  return `${code}-section-${index + 1}`;
}

export function LegalPage({ page }: { page: LegalPageModel }) {
  const headingId = `${page.code}-heading`;
  return (
    <>
      <section aria-labelledby={headingId} className="bg-paper">
        <div className="mx-auto w-full max-w-[1440px] px-6 pt-24 pb-16 sm:px-10 sm:pt-28 sm:pb-20 lg:px-16 lg:pt-32 lg:pb-24">
          <div className="flex items-center gap-3">
            <span className="block h-px w-10 bg-taupe" aria-hidden />
            <span className="t-label text-taupe-text">{page.eyebrow}</span>
          </div>
          <h1
            id={headingId}
            className="t-display mt-8 max-w-[24ch] text-[clamp(2.5rem,1.25rem+5vw,5rem)] text-ink"
          >
            {page.title}
          </h1>
          <p className="t-body mt-8 max-w-[55ch] text-lg text-ink-mute sm:text-xl">{page.intro}</p>
        </div>
      </section>
      <section className="bg-paper">
        <div className="mx-auto w-full max-w-[1440px] px-6 pb-24 sm:px-10 sm:pb-28 lg:px-16 lg:pb-32">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16">
            <aside className="lg:col-span-3">
              <div className="lg:sticky lg:top-28">
                <p className="t-overline text-ink-mute">{page.tocLabel}</p>
                <ol className="mt-4 space-y-2 t-mono text-xs text-ink-mute">
                  {page.sections.map((section, index) => (
                    <li key={sectionId(page.code, index)}>
                      <a href={`#${sectionId(page.code, index)}`} className="hover:text-taupe-text">
                        {String(index + 1).padStart(2, "0")} ·{" "}
                        {section.heading.replace(/^\d+\.\s*/, "")}
                      </a>
                    </li>
                  ))}
                </ol>
              </div>
            </aside>
            <article className="lg:col-span-8 lg:col-start-5">
              <div className="space-y-12">
                {page.sections.map((section, sectionIndex) => (
                  <section
                    key={sectionId(page.code, sectionIndex)}
                    id={sectionId(page.code, sectionIndex)}
                    className="scroll-mt-28"
                  >
                    <h2 className="t-h2 text-2xl text-ink">{section.heading}</h2>
                    <div className="mt-5 space-y-4 text-pretty text-base leading-[1.7] text-ink-mute">
                      {section.paragraphs.map((paragraph, paragraphIndex) => (
                        <p key={`${sectionIndex}-${paragraphIndex}`}>{paragraph}</p>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
              <p className="t-overline mt-16 text-ink-mute">{page.updatedLabel}</p>
            </article>
          </div>
        </div>
      </section>
    </>
  );
}
