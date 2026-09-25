import type { SiteSetting } from "./strapi";
import { absoluteSiteUrl } from "./site-origin";

function trimmed(value: string | null | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized || undefined;
}

export function safeJsonLd(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

export function buildOrganizationJsonLd(
  settings: SiteSetting,
  sameAs: readonly string[] = [],
): Record<string, unknown> {
  const streetAddress = trimmed(settings.address);
  const addressLocality = trimmed(settings.addressCity);
  const addressRegion = trimmed(settings.addressRegion);
  const email = trimmed(settings.contactEmail);
  const telephone = trimmed(settings.contactPhone);
  const description = trimmed(settings.tagline);
  const areaServed = trimmed(settings.dispatchCoverage);
  const address =
    streetAddress || addressLocality || addressRegion
      ? {
          "@type": "PostalAddress",
          ...(streetAddress ? { streetAddress } : {}),
          ...(addressLocality ? { addressLocality } : {}),
          ...(addressRegion ? { addressRegion } : {}),
          addressCountry: "CL",
        }
      : undefined;
  const contactPoint =
    email || telephone
      ? {
          "@type": "ContactPoint",
          contactType: "sales",
          ...(email ? { email } : {}),
          ...(telephone ? { telephone } : {}),
          ...(areaServed ? { areaServed } : {}),
          availableLanguage: ["es-CL"],
        }
      : undefined;

  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: settings.siteName.trim(),
    url: absoluteSiteUrl("/"),
    ...(description ? { description } : {}),
    ...(address ? { address } : {}),
    ...(contactPoint ? { contactPoint } : {}),
    ...(sameAs.length > 0 ? { sameAs: [...sameAs] } : {}),
  };
}
