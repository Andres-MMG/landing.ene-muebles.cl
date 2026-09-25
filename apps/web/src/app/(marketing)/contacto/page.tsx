import type { Metadata } from "next";
import {
  FALLBACK_SITE_SETTINGS,
  getContactPage,
  getContactProductBySlug,
  getContactProductOptions,
  getSiteSettings,
} from "@/lib/strapi";
import { buildWhatsAppHandoff } from "@/lib/whatsapp";
import { formatAddress } from "@/lib/address";
import { normalizeProductSlug } from "@/lib/lead-policy";
import { ContactForm } from "@/components/ContactForm";
import { getLegalPage } from "@/lib/legal-pages";
import { buildSeoMetadata, FALLBACK_SHARE_IMAGE_ALT, resolveSeoText } from "@/lib/seo-metadata";

// Must not be statically prerendered at build time: this page fetches
// site settings from the CMS, which is unreachable during `next build`
// (web and cms build in parallel in the Coolify compose). The fetches
// in lib/strapi.ts keep their own 60s SWR cache at runtime.
export const dynamic = "force-dynamic";

const CONTACT_METADATA_TITLE = "Contacto";
const CONTACT_METADATA_DESCRIPTION =
  "Habla con Ene Muebles: WhatsApp, email, teléfono y dirección para cotizar mobiliario escolar y de oficina para tu institución.";

export async function generateMetadata(): Promise<Metadata> {
  const [content, settings] = await Promise.all([
    getContactPage(),
    getSiteSettings().catch(() => FALLBACK_SITE_SETTINGS),
  ]);
  return buildSeoMetadata({
    title: resolveSeoText(content.seoTitle) ?? CONTACT_METADATA_TITLE,
    description: resolveSeoText(content.seoDescription) ?? CONTACT_METADATA_DESCRIPTION,
    path: "/contacto",
    siteName: settings.siteName,
    imageAlt: resolveSeoText(settings.seoShareImageAlt) ?? FALLBACK_SHARE_IMAGE_ALT,
  });
}

type ContactoPageProps = {
  searchParams?: Promise<{ product?: string | string[] }>;
};

export default async function ContactoPage({ searchParams }: ContactoPageProps) {
  const requestedProduct = (await searchParams)?.product;
  const requestedSlug = normalizeProductSlug(
    Array.isArray(requestedProduct) ? requestedProduct[0] : requestedProduct,
  );
  const [settings, contactPage, productOptions, selectedProduct, privacyPage] = await Promise.all([
    getSiteSettings(),
    getContactPage(),
    getContactProductOptions(),
    getContactProductBySlug(requestedSlug),
    getLegalPage("privacy"),
  ]);
  // B1 (U7): structured address — the street renders alone when no
  // city/region is configured (both are unconfirmed), and appends
  // ", {city}" / ", {region}" as soon as the client confirms them.
  const address = formatAddress(settings);

  const whatsappHref = buildWhatsAppHandoff(settings)?.href ?? null;

  return (
    <>
      <section aria-labelledby="contacto-heading" className="bg-paper">
        <div className="mx-auto grid w-full max-w-[1440px] grid-cols-1 gap-12 px-6 pt-24 pb-16 sm:px-10 sm:pt-28 sm:pb-20 lg:grid-cols-12 lg:gap-16 lg:px-16 lg:pt-32 lg:pb-24">
          <div className="lg:col-span-7">
            <div className="flex items-center gap-3">
              <span className="block h-px w-10 bg-taupe" aria-hidden />
              <span className="t-label text-taupe-text">{contactPage.heroEyebrow}</span>
            </div>
            <h1
              id="contacto-heading"
              className="t-display mt-8 max-w-[20ch] text-[clamp(2.5rem,1.25rem+5vw,5rem)] text-ink"
            >
              {contactPage.heroTitle}
            </h1>
            <p className="t-body mt-8 max-w-[55ch] text-lg text-ink-mute sm:text-xl">
              {contactPage.heroBody}
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
              {whatsappHref ? (
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-3 bg-ink px-7 py-4 text-sm font-medium uppercase tracking-[0.18em] text-paper transition-colors duration-500 hover:bg-taupe-deep"
                >
                  {contactPage.whatsappCtaLabel}
                  <span aria-hidden>→</span>
                </a>
              ) : null}
              {settings.contactEmail ? (
                <a
                  href={`mailto:${settings.contactEmail}`}
                  className="t-label text-ink underline-offset-[6px] hover:text-taupe-text hover:underline tap-target"
                >
                  {contactPage.emailCtaLabel} · {settings.contactEmail}
                </a>
              ) : null}
            </div>
          </div>
          <aside className="lg:col-span-4 lg:col-start-9">
            <p className="t-overline text-ink-mute">{contactPage.alternateContactEyebrow}</p>
            <dl className="mt-4 space-y-0 border-t border-ink-line">
              {settings.contactPhone ? (
                <div className="flex items-baseline justify-between border-b border-ink-line py-4">
                  <dt className="t-overline text-ink-mute">{contactPage.phoneContactLabel}</dt>
                  <dd className="t-mono text-base text-ink">
                    <a
                      href={`tel:${settings.contactPhone.replace(/\s/g, "")}`}
                      className="transition-colors hover:text-taupe-text"
                    >
                      {settings.contactPhone}
                    </a>
                  </dd>
                </div>
              ) : null}
              {settings.whatsappNumber ? (
                <div className="flex items-baseline justify-between border-b border-ink-line py-4">
                  <dt className="t-overline text-ink-mute">{contactPage.whatsappContactLabel}</dt>
                  <dd className="t-mono text-base text-ink">{settings.whatsappNumber}</dd>
                </div>
              ) : null}
              {settings.businessHours ? (
                <div className="flex items-baseline justify-between border-b border-ink-line py-4">
                  <dt className="t-overline text-ink-mute">{contactPage.businessHoursLabel}</dt>
                  <dd className="t-mono text-base text-ink">{settings.businessHours}</dd>
                </div>
              ) : null}
              {address ? (
                <div className="flex items-baseline justify-between py-4">
                  <dt className="t-overline text-ink-mute">{contactPage.addressLabel}</dt>
                  <dd className="t-mono text-sm text-ink-mute">{address}</dd>
                </div>
              ) : null}
            </dl>
          </aside>
        </div>
      </section>

      <section className="bg-ink text-paper">
        <div className="mx-auto w-full max-w-[1440px] px-6 pt-24 pb-20 sm:px-10 sm:pt-28 sm:pb-24 lg:px-16 lg:pt-32 lg:pb-28">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-5">
              <div className="flex items-center gap-3">
                <span className="block h-px w-10 bg-taupe" aria-hidden />
                <span className="t-label text-taupe">{contactPage.formEyebrow}</span>
              </div>
              <h2 className="t-h2 mt-6 text-[clamp(2rem,1.2rem+3vw,3rem)] text-paper">
                {contactPage.formTitle}
              </h2>
              <p className="t-body mt-6 text-base text-paper-mute-on-ink">{contactPage.formBody}</p>
            </div>
            <ContactForm
              copy={{
                nameFieldLabel: contactPage.nameFieldLabel,
                institutionFieldLabel: contactPage.institutionFieldLabel,
                emailFieldLabel: contactPage.emailFieldLabel,
                phoneFieldLabel: contactPage.phoneFieldLabel,
                productFieldLabel: contactPage.productFieldLabel,
                generalInquiryLabel: contactPage.generalInquiryLabel,
                regionFieldLabel: contactPage.regionFieldLabel,
                regionPlaceholder: contactPage.regionPlaceholder,
                messageFieldLabel: contactPage.messageFieldLabel,
                consentBeforeLink: contactPage.consentBeforeLink,
                consentPrivacyLinkLabel: contactPage.consentPrivacyLinkLabel,
                consentAfterLink: contactPage.consentAfterLink,
                responseTimeText: contactPage.responseTimeText,
                submitLabel: contactPage.submitLabel,
              }}
              productOptions={productOptions}
              initialProductSlug={selectedProduct?.slug ?? null}
              consentVersion={privacyPage.version}
            />
          </div>
        </div>
      </section>
    </>
  );
}
