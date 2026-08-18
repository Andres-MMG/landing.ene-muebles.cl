import type { ContactCTASection, SiteSetting } from "@/lib/strapi";
import { buildWhatsAppHandoff } from "@/lib/whatsapp";
import { formatAddress } from "@/lib/address";
import { site } from "@ene/ui-tokens";

type ContactCTAProps = {
  settings: SiteSetting;
  /**
   * Batch 2: heading/body/button-label/button-href come from the
   * Strapi `contact-cta-section` singleton (always returns a typed
   * fallback). Per-field precedence: section copy wins when set,
   * otherwise the legacy `site.contactHeading / site.contactBody /
   * site.whatsappCta` tokens render. The contact-channel data
   * (phone, whatsapp number, email, address, hours) stays on
   * `site-setting` because it is institution-level identity, not
   * section copy.
   */
  section?: ContactCTASection;
};

const DEFAULT_WHATSAPP_MESSAGE =
  "Hola, me gustaría solicitar una cotización de mobiliario institucional.";

/**
 * ContactCTA — full-bleed ink block.
 *
 * One large heading, one body paragraph, one WhatsApp CTA, then a
 * data-rail with email, phone, hours, and address. Mono throughout:
 * the rail reads as a hardware spec sheet, not a sales pitch.
 */
export function ContactCTA({ settings, section }: ContactCTAProps) {
  const title = section?.title ?? site.contactHeading;
  const body = section?.body ?? site.contactBody;
  const buttonLabel = section?.buttonLabel ?? site.whatsappCta;
  // `section.buttonHref` is set when the editor wants a non-WhatsApp
  // CTA (e.g. mailto:). When absent we build the WhatsApp href from
  // `settings.whatsappNumber` exactly like before.
  const explicitHref = section?.buttonHref?.trim() || null;
  const whatsAppHref =
    !explicitHref &&
    (buildWhatsAppHandoff(settings, {
      fallbackMessage: DEFAULT_WHATSAPP_MESSAGE,
    })?.href ??
      null);
  const buttonHref = explicitHref ?? whatsAppHref;
  // B1 (U7): same structured address as the footer and /contacto —
  // street alone until the client confirms city/region.
  const address = formatAddress(settings);

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
              {title}
            </h2>
            <p className="t-body mt-8 max-w-[52ch] text-lg text-paper-mute-on-ink">
              {body}
            </p>
            <div className="mt-12 flex flex-wrap items-center gap-x-8 gap-y-4">
              {buttonHref ? (
                <a
                  href={buttonHref}
                  target={buttonHref.startsWith("http") ? "_blank" : undefined}
                  rel={
                    buttonHref.startsWith("http")
                      ? "noopener noreferrer"
                      : undefined
                  }
                  className="group inline-flex items-center gap-3 bg-taupe px-7 py-4 text-sm font-medium uppercase tracking-[0.18em] text-ink transition-colors duration-500 hover:bg-paper"
                >
                  {buttonLabel}
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
                  className="t-label inline-flex items-center gap-2 text-paper underline-offset-[6px] transition-colors hover:text-taupe hover:underline tap-target"
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
                  <dt className="t-overline text-paper-mute-on-ink">
                    {site.phoneLabel}
                  </dt>
                  <dd className="t-mono mt-2 text-lg text-paper">
                    <a
                      href={`tel:${settings.contactPhone.replace(/\s/g, "")}`}
                      className="transition-colors hover:text-taupe tap-target"
                    >
                      {settings.contactPhone}
                    </a>
                  </dd>
                </div>
              ) : null}
              {settings.whatsappNumber ? (
                <div className="border-t border-paper-line-on-ink pt-4">
                  <dt className="t-overline text-paper-mute-on-ink">
                    {site.whatsappLabel}
                  </dt>
                  <dd className="t-mono mt-2 text-lg text-paper">
                    {settings.whatsappNumber}
                  </dd>
                </div>
              ) : null}
              {address ? (
                <div className="border-t border-paper-line-on-ink pt-4">
                  <dt className="t-overline text-paper-mute-on-ink">
                    {site.addressLabel}
                  </dt>
                  <dd className="t-mono mt-2 text-sm text-paper-mute-on-ink">
                    {address}
                  </dd>
                </div>
              ) : null}
              {settings.businessHours ? (
                <div className="border-t border-paper-line-on-ink pt-4">
                  <dt className="t-overline text-paper-mute-on-ink">
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
