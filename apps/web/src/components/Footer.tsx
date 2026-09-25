import Link from "next/link";
import { getProductCount, getPublicRut, type FooterBlock, type SiteSetting } from "@/lib/strapi";
import { formatAddress } from "@/lib/address";
import { resolvePublicNavigation } from "@/lib/public-navigation";
import { isSocialNetwork, socialHref } from "@/lib/social";
import { site as siteTokens } from "@ene/ui-tokens";
import { SocialIcon } from "./SocialIcon";

type FooterCopyBlock = FooterBlock &
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

type FooterProps = {
  settings: SiteSetting;
  block?: FooterCopyBlock;
};

function readCopy(value: unknown, fallback: string, maxLength: number): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length <= maxLength ? trimmed : fallback;
}

function readSiteFact(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

/**
 * Public institutional footer.
 *
 * Routes, link order, icons, and accessibility structure are code-owned.
 * Editorial labels come from Footer Block, while brand/contact facts remain
 * owned by Site Setting.
 */
export async function Footer({ settings, block }: FooterProps) {
  const year = new Date().getFullYear();
  const navigation = resolvePublicNavigation(settings);
  const socials = settings.socialLinks ?? {};
  const siteName = readCopy(settings.siteName, siteTokens.brand, 120);
  const address = formatAddress(settings);
  const coverage = readSiteFact(settings.dispatchCoverage);
  const productCount = await getProductCount();

  const productCountSuffix = readCopy(
    block?.productCountSuffix,
    "productos certificados para instituciones",
    160,
  );
  const promiseText =
    productCount > 0
      ? String(productCount) + " " + productCountSuffix
      : readCopy(block?.tagline, siteTokens.footerCopy, 300);

  const catalogHeading = readCopy(block?.catalogHeading, navigation.labels.catalog, 60);
  const contactHeading = readCopy(block?.contactHeading, navigation.labels.contact, 60);
  const legalHeading = readCopy(block?.legalHeading, "Legal", 60);
  const socialHeading = readCopy(block?.socialHeading, "Redes", 60);
  const catalogCtaLabel = readCopy(block?.catalogCtaLabel, "Ver catálogo", 80);
  const officeLineLabel = readCopy(block?.officeLineLabel, "Línea oficina", 80);
  const schoolLineLabel = readCopy(block?.schoolLineLabel, "Línea escolar", 80);
  const aboutLinkLabel = readCopy(block?.aboutLinkLabel, "Sobre nosotros", 80);
  const termsLinkLabel = readCopy(block?.termsLinkLabel, "Términos y condiciones", 120);
  const privacyLinkLabel = readCopy(block?.privacyLinkLabel, "Política de privacidad", 120);
  const rutLabel = readCopy(block?.rutLabel, "RUT", 30);
  const catalogStampLabel = readCopy(block?.catalogStampLabel, "Catálogo institucional", 120);
  const writtenBackingLabel = readCopy(block?.writtenBackingLabel, "Respaldo escrito", 120);

  const defaultCopyright = "© " + String(year) + " " + siteName;
  const copyrightText = readCopy(block?.copyrightText, defaultCopyright, 200);
  const legalSnippet = readCopy(block?.legalSnippet, "Proveedor institucional · Chile", 300);
  const warrantyText = readSiteFact(settings.warrantyText) ?? "Garantía 1 año";
  const rut = getPublicRut(settings.rut);

  return (
    <footer className="bg-ink text-paper">
      <div className="border-t border-paper-line-on-ink">
        <div className="mx-auto w-full max-w-[1440px] px-6 py-10 sm:px-10 lg:px-16 lg:py-12">
          <p className="t-overline line-clamp-2 max-w-[80ch] break-words text-paper-mute-on-ink">
            {promiseText}
          </p>
        </div>
      </div>

      <div className="mx-auto grid w-full max-w-[1440px] grid-cols-1 gap-12 px-6 pt-12 pb-16 sm:grid-cols-2 sm:px-10 lg:grid-cols-12 lg:gap-10 lg:px-16 lg:pt-16 lg:pb-20">
        <div className="min-w-0 lg:col-span-4">
          <p className="t-h2 break-words text-3xl text-paper sm:text-4xl">{siteName}</p>
          {settings.tagline ? (
            <p className="t-body mt-4 max-w-[36ch] break-words text-base text-paper-mute-on-ink">
              {settings.tagline}
            </p>
          ) : null}
          {rut ? (
            <p className="t-overline mt-8 break-words text-taupe">{rutLabel + " " + rut}</p>
          ) : null}
        </div>

        <div className="min-w-0 lg:col-span-2">
          <p className="t-overline break-words text-paper-mute-on-ink">{catalogHeading}</p>
          <ul className="mt-6 space-y-3">
            {navigation.items.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href as never}
                  className="t-body tap-target break-words text-sm text-paper transition-colors hover:text-taupe"
                >
                  {item.label}
                </Link>
              </li>
            ))}
            <li>
              <Link
                href="/catalogo"
                className="t-body tap-target break-words text-sm text-paper transition-colors hover:text-taupe"
              >
                {catalogCtaLabel}
              </Link>
            </li>
            <li>
              <Link
                href="/categoria/oficina"
                className="t-body tap-target break-words text-sm text-paper transition-colors hover:text-taupe"
              >
                {officeLineLabel}
              </Link>
            </li>
            <li>
              <Link
                href="/categoria/escolar"
                className="t-body tap-target break-words text-sm text-paper transition-colors hover:text-taupe"
              >
                {schoolLineLabel}
              </Link>
            </li>
          </ul>
        </div>

        <div className="min-w-0 lg:col-span-3">
          <p className="t-overline break-words text-paper-mute-on-ink">{contactHeading}</p>
          <ul className="t-mono mt-6 space-y-3 text-sm text-paper-mute-on-ink">
            {settings.contactEmail ? (
              <li className="break-words">
                <a
                  href={"mailto:" + settings.contactEmail}
                  className="tap-target transition-colors hover:text-taupe"
                >
                  {settings.contactEmail}
                </a>
              </li>
            ) : null}
            {settings.contactPhone ? (
              <li className="break-words">
                <a
                  href={"tel:" + settings.contactPhone.replace(/\s/g, "")}
                  className="tap-target transition-colors hover:text-taupe"
                >
                  {settings.contactPhone}
                </a>
              </li>
            ) : null}
            {settings.whatsappNumber ? (
              <li className="break-words">{settings.whatsappNumber}</li>
            ) : null}
            {address ? <li className="break-words text-xs">{address}</li> : null}
            {coverage ? (
              <li className="line-clamp-3 max-w-[36ch] break-words text-xs">{coverage}</li>
            ) : null}
          </ul>
        </div>

        <div className="min-w-0 lg:col-span-3">
          <p className="t-overline break-words text-paper-mute-on-ink">{legalHeading}</p>
          <ul className="t-mono mt-6 space-y-3 text-sm text-paper-mute-on-ink">
            <li>
              <Link
                href="/nosotros"
                className="tap-target break-words transition-colors hover:text-taupe"
              >
                {aboutLinkLabel}
              </Link>
            </li>
            <li>
              <Link
                href="/terminos"
                className="tap-target break-words transition-colors hover:text-taupe"
              >
                {termsLinkLabel}
              </Link>
            </li>
            <li>
              <Link
                href="/privacidad"
                className="tap-target break-words transition-colors hover:text-taupe"
              >
                {privacyLinkLabel}
              </Link>
            </li>
            <li className="break-words">{copyrightText}</li>
            <li className="break-words">{legalSnippet}</li>
            {settings.businessHours ? (
              <li className="break-words text-xs">{settings.businessHours}</li>
            ) : null}
          </ul>
          {Object.keys(socials).length > 0 ? (
            <div className="mt-8">
              <p className="t-overline break-words text-paper-mute-on-ink">{socialHeading}</p>
              <ul className="mt-4 flex flex-wrap gap-3 text-paper-mute-on-ink">
                {Object.entries(socials).map(([network, handle]) => {
                  if (!isSocialNetwork(network)) return null;
                  const href = socialHref(network, handle);
                  if (!href) return null;
                  return (
                    <li key={network}>
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={"Abrir " + network + " de " + siteName}
                        title={network + " · " + handle}
                        className="inline-flex h-11 w-11 items-center justify-center border border-paper-line-on-ink transition-colors hover:border-taupe hover:text-taupe focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-paper"
                      >
                        <SocialIcon network={network} />
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
        </div>
      </div>

      <div className="border-t border-paper-line-on-ink">
        <div className="mx-auto flex w-full max-w-[1440px] flex-col items-start justify-between gap-3 px-6 py-6 sm:flex-row sm:items-start sm:px-10 lg:px-16">
          <p className="t-overline line-clamp-2 min-w-0 max-w-[64ch] break-words text-paper-mute-on-ink">
            {catalogStampLabel + " · " + String(year)}
          </p>
          <p className="t-overline line-clamp-2 min-w-0 max-w-[64ch] break-words text-paper-mute-on-ink sm:text-right">
            {writtenBackingLabel + " · " + warrantyText}
          </p>
        </div>
      </div>
    </footer>
  );
}
