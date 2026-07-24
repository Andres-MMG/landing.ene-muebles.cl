import type { SiteSetting } from "@/lib/strapi";
import { buildWhatsAppLink } from "@/lib/strapi";
import { site } from "@ene/ui-tokens";

type ContactCTAProps = {
  settings: SiteSetting;
};

/**
 * ContactCTA — full-bleed ink block.
 *
 * One large heading, one body paragraph, one WhatsApp CTA, then a
 * data-rail with email, phone, hours, and address. Mono throughout:
 * the rail reads as a hardware spec sheet, not a sales pitch.
 */
export function ContactCTA({ settings }: ContactCTAProps) {
  const whatsappHref = settings.whatsappNumber
    ? buildWhatsAppLink(
        settings.whatsappNumber,
        "Hola, me gustaría solicitar una cotización de mobiliario institucional."
      )
    : null;

  return (
    <section
      id="contacto"
      aria-labelledby="contacto-heading"
      className="bg-ink text-paper"
    >
      <div className="mx-auto w-full max-w-[1440px] px-6 pt-24 pb-20 sm:px-10 sm:pt-28 sm:pb-24 lg:px-16 lg:pt-36 lg:pb-28">
        <header className="grid grid-cols-1 gap-12 border-b border-paper-line-on-ink pb-16 lg:grid-cols-12 lg:gap-12 lg:pb-20">
          <div className="lg:col-span-7">
            <div className="flex items-center gap-3">
              <span className="block h-px w-10 bg-taupe" aria-hidden />
              <span className="t-label text-taupe">{site.contactOverline}</span>
            </div>
            <h2
              id="contacto-heading"
              className="t-h2 mt-6 max-w-[20ch] text-[clamp(2.25rem,1.4rem+3.6vw,4rem)] text-paper"
            >
              {site.contactHeading}
            </h2>
            <p className="t-body mt-8 max-w-[52ch] text-lg text-paper-mute-on-ink">
              {site.contactBody}
            </p>
            <div className="mt-12 flex flex-wrap items-center gap-x-8 gap-y-4">
              {whatsappHref ? (
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-center gap-3 bg-taupe px-7 py-4 text-sm font-medium uppercase tracking-[0.18em] text-ink transition-colors duration-500 hover:bg-paper"
                >
                  {site.whatsappCta}
                  <span
                    aria-hidden
                    className="transition-transform duration-500 group-hover:translate-x-1"
                  >
                    →
                  </span>
                </a>
              ) : null}
              {settings.contactEmail ? (
                <a
                  href={`mailto:${settings.contactEmail}`}
                  className="t-label inline-flex items-center gap-2 text-paper underline-offset-[6px] transition-colors hover:text-taupe hover:underline"
                >
                  {site.emailLabel} · {settings.contactEmail}
                </a>
              ) : null}
            </div>
          </div>

          <aside className="lg:col-span-4 lg:col-start-9">
            <dl className="space-y-6">
              {settings.contactPhone ? (
                <div className="border-t border-paper-line-on-ink pt-4">
                  <dt className="t-mono text-[10px] uppercase tracking-[0.22em] text-paper-mute-on-ink">
                    {site.phoneLabel}
                  </dt>
                  <dd className="t-mono mt-2 text-lg text-paper">
                    <a
                      href={`tel:${settings.contactPhone.replace(/\s/g, "")}`}
                      className="transition-colors hover:text-taupe"
                    >
                      {settings.contactPhone}
                    </a>
                  </dd>
                </div>
              ) : null}
              {settings.whatsappNumber ? (
                <div className="border-t border-paper-line-on-ink pt-4">
                  <dt className="t-mono text-[10px] uppercase tracking-[0.22em] text-paper-mute-on-ink">
                    {site.whatsappLabel}
                  </dt>
                  <dd className="t-mono mt-2 text-lg text-paper">
                    {settings.whatsappNumber}
                  </dd>
                </div>
              ) : null}
              {settings.address ? (
                <div className="border-t border-paper-line-on-ink pt-4">
                  <dt className="t-mono text-[10px] uppercase tracking-[0.22em] text-paper-mute-on-ink">
                    {site.addressLabel}
                  </dt>
                  <dd className="t-mono mt-2 text-sm text-paper-mute-on-ink">
                    {settings.address}
                  </dd>
                </div>
              ) : null}
              {settings.businessHours ? (
                <div className="border-t border-paper-line-on-ink pt-4">
                  <dt className="t-mono text-[10px] uppercase tracking-[0.22em] text-paper-mute-on-ink">
                    {site.hoursLabel}
                  </dt>
                  <dd className="t-mono mt-2 text-sm text-paper-mute-on-ink">
                    {settings.businessHours}
                  </dd>
                </div>
              ) : null}
            </dl>
          </aside>
        </header>
      </div>
    </section>
  );
}
